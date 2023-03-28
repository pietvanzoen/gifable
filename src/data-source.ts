import { DataSource } from 'typeorm';
import { Asset } from './entity/Asset';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: './gifme.db',
  synchronize: true,
  logging: true,
  entities: [Asset],
  subscribers: [],
  migrations: [],
});
