// eslint-disable-next-line
import { Knex } from 'knex'

declare module 'knex/types/tables' {
  export interface Tables {
    users: {
      id: string
      name: string
      password: string
      created_at: string
    }
    meals: {
      id: string
      name: string
      description: string
      time: string
      is_inside_diet: boolean
      fk_user_id: string
      created_at: string
      updated_at: string
    }
  }
}
