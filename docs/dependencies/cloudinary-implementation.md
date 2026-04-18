# Cloudinary (Node.js SDK) - implementation notes

Key references:

- [Node.js SDK](https://cloudinary.com/documentation/node_integration)
- [Node.js image and video upload](https://cloudinary.com/documentation/node_image_and_video_upload)
- [Node.js image transformations](https://cloudinary.com/documentation/node_image_manipulation)
- [Node.js asset management](https://cloudinary.com/documentation/node_asset_administration)

Verified against the official docs on 2026-04-18.

## Current repo status

The backend uploads images through `CloudinaryImageStore` in `backend/src/libs/cloudinary/utils.ts`.

## Install

```bash
cd backend
npm i cloudinary
```

## Configure

Cloudinary recommends `CLOUDINARY_URL`:

```bash
export CLOUDINARY_URL="cloudinary://API_KEY:API_SECRET@CLOUD_NAME"
```

Basic helper:

```ts
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({ secure: true });

export { cloudinary };
```

Notes:

- Cloudinary Node examples use the `v2` API.
- Keep credentials out of git.

## Upload from the backend

For a mobile upload that first hits your backend, `upload_stream` is the simplest fit.

```ts
import { cloudinary } from "../lib/cloudinary";

export async function uploadImage(buffer: Buffer, publicId: string) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: "grim",
          public_id: publicId,
          resource_type: "image"
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      )
      .end(buffer);
  });
}
```

Cloudinary also documents:

- `uploader.upload(...)` for local paths or remote URLs
- `upload_large(...)` for large files

If you upload video or raw files, set `resource_type` explicitly.

## Transform and deliver

You can generate derived URLs without uploading a second copy:

```ts
import { cloudinary } from "../lib/cloudinary";

const previewUrl = cloudinary.url("grim/rec_xyz", {
  width: 800,
  height: 800,
  crop: "limit"
});
```

## Delete

```ts
import { cloudinary } from "../lib/cloudinary";

await cloudinary.uploader.destroy("grim/rec_xyz", {
  resource_type: "image"
});
```

## What to keep in your DB

At minimum, keep:

```json
{
  "cloudinaryPublicId": "grim/rec_xyz",
  "imageUrl": "https://res.cloudinary.com/.../image/upload/.../abc.jpg"
}
```

That is enough for later fetches and cleanup.
