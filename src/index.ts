import { createConnection, Connection, ConnectionOptions } from 'mongoose';

export interface DatabaseClientConfig {
  /**
   * Mongoose connection options.
   *
   * @see https://mongoosejs.com/docs/connections.html#options
   */
  options: ConnectionOptions;

  /**
   * The connection URI.
   */
  uri: string;
}

export interface DatabaseClient extends DatabaseClientConfig {
  /**
   * Mongoose connection object.
   */
  connection: Connection;
}

export type DatabaseClientsMap = Map<string, DatabaseClient>;

const _defaults: DatabaseClientConfig = Object.freeze<DatabaseClientConfig>({
  uri: null,
  options: {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true
  }
});

export interface DatabaseManager {
  /**
   * Gets a database client by name.
   *
   * @returns {Map} The database clients map.
   */
  clients: DatabaseClientsMap;

  /**
   * Retrieves a client's connection.
   *
   * @param {string} name The client name.
   *
   * @returns {Connection|null} The client's connection if any.
   */
  connection(name: string): Connection;

  /**
   * Adds a named database client with the provided config.
   *
   * @param {string} name The client name.
   * @param {object} config The client config.
   *
   * @returns {object} The created client.
   */
  add(name: string, config: DatabaseClientConfig): void;

  /**
   * Connects a named client to the database.
   *
   * @param {string} name The client name.
   *
   * @returns {Connection} The current client connection.
   */
  connect(name: string): Promise<Connection>;

  /**
   * Disconnects a named client from the database.
   *
   * @param {string} name The client name.
   * @param {boolean} force Whether to force disconnection.
   *
   * @returns {Promise} A promise to the disconnection.
   */
  disconnect(name: string, force?: boolean): Promise<void>;

  /**
   * Disconnects all clients from their databases.
   *
   * @param {boolean} force Whether to force disconnection.
   */
  disconnectAll(force?: boolean): Promise<void>;
}

/**
 * Retrieves a connection by client name.
 *
 * @param {Map} clients The clients map.
 * @param {string} name The client name.
 * @returns {object} The mongoose connection object.
 */
function getConnectionByName(clients: DatabaseClientsMap, name: string): Connection {
  if (clients.has(name)) {
    return clients.get(name).connection;
  }

  return null;
}

/**
 * Creates or updates a named database client.
 *
 * @param {object} config The configuration object.
 * @param {object} connection The current database client connection.
 *
 * @returns {object} The created or updated database connection object.
 */
function create(config: DatabaseClientConfig, connection: Connection): DatabaseClient {
  const { options, uri }: DatabaseClientConfig = {
    ..._defaults,
    ...config,
    options: {
      ..._defaults.options,
      ...config.options
    }
  };

  const client: DatabaseClient = { options, connection, uri };

  return client;
}

/**
 * Returns the connection for the client.
 *
 * @param {Map} clients The clients map.
 * @param {string} name The client name.
 * @returns {Connection} The client connection.
 */
function connection(clients: DatabaseClientsMap, name: string): Connection {
  const { connection } = clients.get(name);

  return connection;
}

/**
 * Creates a client's database connection or reuses it.
 *
 * @param {string} name The client name.
 * @param {object} client The database client object.
 *
 * @returns {Connection} The current or created connection.
 */
async function connect(name, { connection, uri, options }: DatabaseClient): Promise<Connection> {
  if (connection) {
    return connection;
  }

  return createConnection(uri, options);
}

/**
 * Closes a database connection by name.
 *
 * @param {Map} client The client to disconnect.
 * @param {boolean} force Whether to force disconnection.
 *
 * @returns {object} The updated database client.
 */
function disconnect(client: DatabaseClient, force = false): Promise<void> {
  if (!client.connection) {
    return Promise.resolve();
  }

  return client.connection.close(force);
}

/**
 * Updates a database client connection.
 *
 * @param {Map} clients The database clients map.
 * @param {string} name The database client name.
 * @param {Connection} connection The connection to set.
 */
function updateClientConnection(clients: DatabaseClientsMap, name: string, connection: Connection): void {
  const client = clients.get(name);

  clients.set(name, {
    ...client,
    connection
  });
}

/**
 * Creates a database manager instance.
 *
 * @returns {object} The database manager instance.
 */
export function createDatabaseManager(): DatabaseManager {
  const clients = new Map<string, DatabaseClient>();

  return Object.freeze<DatabaseManager>({
    connection: connection.bind(null, clients),

    get clients(): DatabaseClientsMap {
      return clients;
    },

    add: (name, config) => {
      const connection = getConnectionByName(clients, name);
      const client = create(config, connection);

      clients.set(name, client);

      return client;
    },

    connect: async name => {
      const client: DatabaseClient = clients.get(name);
      const connection: Connection = await connect(name, client);

      updateClientConnection(clients, name, connection);

      return connection;
    },

    disconnect: async (name, force) => {
      const client: DatabaseClient = clients.get(name);

      await disconnect(client, force);

      updateClientConnection(clients, name, null);
    },

    disconnectAll: async force => {
      for (const [name, client] of clients.entries()) {
        await disconnect(client, force);

        updateClientConnection(clients, name, null);
      }
    }
  });
}
