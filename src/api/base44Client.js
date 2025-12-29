// Base44 dependency removed; this stub keeps the app stable without external SDKs.
const noop = async () => null;
const noopList = async () => [];
const entityHandler = {
  get() {
    return {
      list: noopList,
      filter: noopList,
      create: noop,
      update: noop,
      delete: noop,
    };
  },
};

export const base44 = {
  auth: {
    isAuthenticated: async () => false,
    me: async () => null,
    updateMe: async () => null,
  },
  entities: new Proxy({}, entityHandler),
  integrations: {
    Core: {
      UploadFile: async () => ({ file_url: "" }),
      SendEmail: async () => ({ ok: false }),
    },
  },
};

export default base44;

