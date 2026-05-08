import * as joi from 'joi';

interface EnvVars {
  PORT: number;
  DATABASE_URL: string;
  USERS_MS_PORT: number;
  USERS_MS_HOST: string;
}

const envSchema = joi
  .object({
    PORT: joi.number().required(),
    DATABASE_URL: joi.string().required(),
    USERS_MS_PORT: joi.number().required(),
    USERS_MS_HOST: joi.string().required(),
  })
  .unknown(true);

const { error, value } = envSchema.validate(process.env);

if (error) {
  throw new Error(`ENV config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,
  databaseUrl: envVars.DATABASE_URL,
  usersMsPort: envVars.USERS_MS_PORT,
  usersMsHost: envVars.USERS_MS_HOST,
};
