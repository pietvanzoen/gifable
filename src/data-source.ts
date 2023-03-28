import { DataSource, DataSourceOptions } from 'typeorm';
import { Asset } from './entity/Asset';

export const createDataSource = (options: DataSourceOptions) =>
  new DataSource({
    ...options,
    logging: true,
    entities: [Asset],
    subscribers: [],
    migrations: [],
  });

export const AppDataSource = createDataSource({
  type: 'sqlite',
  database: './gifme.db',
  synchronize: true,
});

export const initTestDataSource = async () => {
  const dataSource = createDataSource({
    type: 'sqlite',
    database: ':memory:',
    dropSchema: true,
    synchronize: true,
  });

  await dataSource.initialize();

  return dataSource;
};
