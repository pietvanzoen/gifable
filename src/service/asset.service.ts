import { DataSource, Repository } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Asset } from '../entity/Asset';

export class AssetService {
  private assetRepository: Repository<Asset>;

  constructor(dataSource: DataSource = AppDataSource) {
    this.assetRepository = dataSource.getRepository(Asset);
  }

  async create(data: Partial<Asset>) {
    const asset = this.assetRepository.create(data);
    return this.assetRepository.save(asset);
  }
}
