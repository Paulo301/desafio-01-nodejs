import { FastifyInstance } from 'fastify'
import { knex } from '../database'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { checkUserIdExists } from '../middlewares/check-user-id-exists'

export async function mealsRoutes(app: FastifyInstance) {
  app.post('/', { preHandler: [checkUserIdExists] }, async (request, reply) => {
    const createMealBodySchema = z.object({
      name: z.string(),
      description: z.string(),
      time: z.string(),
      isInsideDiet: z.boolean(),
    })

    const { name, description, time, isInsideDiet } =
      createMealBodySchema.parse(request.body)

    const userId = request.cookies.userId

    await knex('meals').insert({
      id: randomUUID(),
      name,
      description,
      time,
      is_inside_diet: isInsideDiet,
      fk_user_id: userId,
    })

    return reply.status(201).send()
  })

  app.put(
    '/:id',
    { preHandler: [checkUserIdExists] },
    async (request, reply) => {
      const editMealBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        time: z.string(),
        isInsideDiet: z.boolean(),
      })

      const editMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { name, description, time, isInsideDiet } =
        editMealBodySchema.parse(request.body)

      const { id } = editMealParamsSchema.parse(request.params)

      const userId = request.cookies.userId

      await knex('meals')
        .where({
          fk_user_id: userId,
          id,
        })
        .update({
          name,
          description,
          time,
          is_inside_diet: isInsideDiet,
          updated_at: new Date().toISOString(),
        })

      return reply.status(201).send()
    },
  )

  app.delete(
    '/:id',
    { preHandler: [checkUserIdExists] },
    async (request, reply) => {
      const getMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = getMealParamsSchema.parse(request.params)

      const { userId } = request.cookies

      const meal = await knex('meals')
        .where({
          fk_user_id: userId,
          id,
        })
        .first()

      if (meal) {
        await knex('meals')
          .where({
            fk_user_id: userId,
            id,
          })
          .del()

        return reply.status(204).send()
      } else {
        return reply.status(404).send()
      }
    },
  )

  app.get('/', { preHandler: [checkUserIdExists] }, async (request) => {
    const { userId } = request.cookies

    const meals = await knex('meals').where('fk_user_id', userId).select()

    return { meals }
  })

  app.get(
    '/:id',
    { preHandler: [checkUserIdExists] },
    async (request, reply) => {
      const getMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const { id } = getMealParamsSchema.parse(request.params)

      const { userId } = request.cookies

      const meal = await knex('meals')
        .where({
          fk_user_id: userId,
          id,
        })
        .first()

      if (meal) {
        return { meal }
      } else {
        return reply.status(404).send()
      }
    },
  )

  app.get(
    '/metrics',
    { preHandler: [checkUserIdExists] },
    async (request, reply) => {
      const { userId } = request.cookies

      const totalMealsCalc = await knex('meals')
        .where('fk_user_id', userId)
        .count('id', { as: 'totalMeals' })
        .first()

      const inDietMealsCalc = await knex('meals')
        .where({ fk_user_id: userId, is_inside_diet: true })
        .count('id', { as: 'inDietMeals' })
        .first()

      const highestInDietSequenceCalc: {
        is_inside_diet: boolean
        total: number
      }[] = await knex.raw(`select is_inside_diet, count(*) as total 
      from (select meals.*,
                   (row_number() over (order by created_at) -
                    row_number() over (partition by is_inside_diet order by created_at)
                   ) as grp
            from meals
           ) meals
      group by grp, is_inside_diet`)

      if (totalMealsCalc && inDietMealsCalc && highestInDietSequenceCalc) {
        return {
          metrics: {
            totalMeals: totalMealsCalc.totalMeals,
            inDietMeals: inDietMealsCalc.inDietMeals,
            outOfDietMeals:
              Number(totalMealsCalc.totalMeals) -
              Number(inDietMealsCalc.inDietMeals),
            highestInDietSequence: highestInDietSequenceCalc.reduce(
              (acc, curr) => {
                return curr.total > acc ? curr.total : acc
              },
              0,
            ),
          },
        }
      } else {
        return reply.status(500).send()
      }
    },
  )
}
