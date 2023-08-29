import { FastifyInstance } from 'fastify'
import { knex } from '../database'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'

export async function usersRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    const createUserBodySchema = z.object({
      name: z.string(),
      password: z.string(),
    })

    const { name, password } = createUserBodySchema.parse(request.body)

    await knex('users').insert({
      id: randomUUID(),
      name,
      password,
    })

    return reply.status(201).send()
  })
  app.post('/login', async (request, reply) => {
    const userLoginBodySchema = z.object({
      name: z.string(),
      password: z.string(),
    })

    const { name, password } = userLoginBodySchema.parse(request.body)

    const user = await knex('users')
      .where({
        name,
        password,
      })
      .first()

    if (user) {
      reply.cookie('userId', user.id, {
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      })

      return reply.status(201).send()
    } else {
      return reply.status(404).send()
    }
  })
}
