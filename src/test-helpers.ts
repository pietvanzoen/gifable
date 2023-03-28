import Chance from 'chance';
import { Asset } from './entity/Asset';

export const chance = new Chance();

export const Fixtures = {
  Asset(options?: Partial<Asset>): Partial<Asset> {
    return {
      url: chance.url(),
      comment: chance.sentence(),
      ...options,
    };
  },
};
