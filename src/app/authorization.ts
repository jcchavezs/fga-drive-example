import "server-only";
import { CredentialsMethod, OpenFgaClient } from "@openfga/sdk";
import { stripObjectName } from "@/helpers/strip-object-name";
import { StoredFile } from "@/store/files";
import { Folder } from "@/store/folders";

function OpenFgaClientConfig() {
  let config = {
    apiUrl: process.env.FGA_API_URL,
    storeId: process.env.FGA_STORE_ID,
    authorizationModelId: process.env.FGA_AUTHORIZATION_MODEL_ID,
  }

  if (process.env.OPENFGA_AUTHN_PRESHARED_KEY) {
    config.credentials = {
      method: CredentialsMethod.ApiToken,
      config: {
          token: process.env.OPENFGA_AUTHN_PRESHARED_KEY as string
      },
    }
  }

  return config
}

export const fgaClient = new OpenFgaClient(OpenFgaClientConfig());

export async function authorizeRootFolder(userId: string): Promise<void> {
  const { allowed } = await fgaClient.check({
    user: `user:${userId}`,
    relation: "owner",
    object: `folder:${userId}`,
  });

  if (!allowed) {
    fgaClient.writeTuples([
      {
        user: `user:${userId}`,
        relation: "owner",
        object: `folder:${userId}`,
      },
    ]);
  }
}

export async function filterFilesForUser(
  files: Array<StoredFile>,
  user: string,
): Promise<Array<StoredFile>> {
  const { responses } = await fgaClient.batchCheck(
    files.map((file) => {
      return {
        user: `user:${user}`,
        object: `file:${file?.id}`,
        relation: "can_view",
      };
    }),
  );

  return responses
    .map((check) =>
      check.allowed
        ? files.find(
            (file) => file?.id === stripObjectName(check._request.object),
          )
        : undefined,
    )
    .filter(Boolean) as Array<StoredFile>;
}

export async function filterFoldersForUser(
  folders: Array<Folder>,
  user: string,
): Promise<Array<Folder>> {
  const { responses } = await fgaClient.batchCheck(
    folders.map((folder) => {
      return {
        user: `user:${user}`,
        object: `folder:${folder?.id}`,
        relation: "can_view",
      };
    }),
  );

  return responses
    .map((check) =>
      check.allowed
        ? folders.find(
            (folder) => folder?.id === stripObjectName(check._request.object),
          )
        : undefined,
    )
    .filter(Boolean) as Array<Folder>;
}
