import { AppDataSource } from "./data-source"
import { Asset } from "./entity/Asset"

AppDataSource.initialize().then(async () => {

    console.log("Inserting a new asset into the database...")
    const asset = new Asset()
    asset.firstName = "Timber"
    asset.lastName = "Saw"
    asset.age = 25
    await AppDataSource.manager.save(asset)
    console.log("Saved a new asset with id: " + asset.id)

    console.log("Loading assets from the database...")
    const assets = await AppDataSource.manager.find(Asset)
    console.log("Loaded assets: ", assets)

    console.log("Here you can setup and run express / fastify / any other framework.")

}).catch(error => console.log(error))
