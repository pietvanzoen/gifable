# Gifable

Gifable is a self hostable gif library manager.

## Features

- Add gifs to your library with searchable comments.
- Find your perfect gif quickly.
- Upload gifs to your S3 compatible bucket.
- Works with javascript disabled.
- Keyboard / accessibility friendly.

## Running with docker

Gifable is available as a docker image.

```sh
docker pull ghcr.io/pietvanzoen/gifable:latest
```

To run the image first setup your configuration. Copy the `.env.example` and update as needed.

```sh
curl https://raw.githubusercontent.com/pietvanzoen/gifable/main/.env.example -o .env
```

Then run the image using `--env-file` flag. You'll also want to attach a volume for the database so it is persisted between runs. In this example we're using a directory `/data` to store the database file. You don't need to create the file, the app will create one if it doesn't exist.

```sh
docker run -d \
  --name gifable \
  --env-file=$PWD/.env \
  -v $PWD/data:/data \
  -e DATABASE_URL="file:/data/gifable.db" \
  ghcr.io/pietvanzoen/gifable:latest
```
