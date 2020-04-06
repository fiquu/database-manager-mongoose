process.env.MONGOMS_SYSTEM_BINARY = '/usr/bin/mongod';

import { MongoMemoryServer } from 'mongodb-memory-server-core';
import mongoose from 'mongoose';
import { expect } from 'chai';

import { createDatabaseManager, DatabaseClientConfig, DatabaseManager } from '../../src';

const servers: Map<string, MongoMemoryServer> = new Map();

servers.set('primary', new MongoMemoryServer());
servers.set('secondary', new MongoMemoryServer());
servers.set('tertiary', new MongoMemoryServer());

const methods = [
  'connect', 'connection', 'disconnect', 'disconnectAll'
];

describe('Database', function () {
  this.timeout(30000);

  let db: DatabaseManager;

  const config: DatabaseClientConfig = {
    options: {},
    uri: null
  };

  before(function () {
    db = createDatabaseManager();

    db.add('default', { ...config });
  });

  it('should be a function', function () {
    expect(createDatabaseManager).to.be.a('function');
  });

  it('should expose API methods', function () {
    for (const method of methods) {
      expect(db[String(method)]).to.be.a('function');
    }
  });

  it('should expose Map API methods', function () {
    const map = new Map();

    for (const method of Object.keys(map)) {
      expect(db[String(method)]).to.be.a('function');
    }
  });

  it('should not set a connection with empty config', function () {
    expect(() => db.add(null, null)).to.throw();
    expect(() => db.add(undefined, undefined)).to.throw();
    expect(() => db.add(null, undefined)).to.throw();
    expect(() => db.add(undefined, null)).to.throw();
  });

  it('should create a new connection with a valid config as default', function () {
    db.add('default', config);

    const keys = [...db.clients.keys()];

    expect(keys).to.not.be.empty;
    expect(keys).to.be.an('array');
    expect(keys).to.include('default');

    const client = db.clients.get('default');

    expect(client).to.be.an('object');
    expect(client).to.have.keys('options', 'uri', 'connection');

    expect(client.options).to.be.an('object');
    expect(client.uri).to.be.null;
    expect(client.connection).to.be.null;
  });

  it('should update a connection with a valid config as default', async function () {
    const uri = await servers.get('primary').getConnectionString();

    db.add('default', {
      ...config,
      uri
    });

    const keys = [...db.clients.keys()];

    expect(keys).to.not.be.empty;
    expect(keys).to.be.an('array');
    expect(keys).to.include('default');

    const client = db.clients.get('default');

    expect(client).to.be.an('object');
    expect(client).to.have.keys('options', 'uri', 'connection');

    expect(client.options).to.be.an('object');
    expect(client.uri).to.be.a('string');
    expect(client.uri).to.equal(uri);
    expect(client.connection).to.be.null;
  });

  it('should have a default connection', function () {
    const hasClient = db.clients.has('default');

    expect(hasClient).to.be.true;
  });

  it('should not be connected to a database as default', function () {
    const client = db.clients.get('default');

    expect(client.connection).to.be.null;
  });

  it('should connect to a database as default', async function () {
    const conn = await db.connect('default');

    expect(conn).to.be.an('object');
    expect(conn).to.be.an.instanceof(mongoose.Connection);
    expect(conn.readyState).to.equal(1);
  });

  it('should reuse the database connection', async function () {
    const { connection } = db.clients.get('default');

    for (let i = 0, l = 3; i < l; i++) {
      expect(await db.connect('default')).to.deep.equal(connection);
    }
  });

  it('should register a model', function () {
    const conn = db.connection('default');

    const Person = conn.model('person', new mongoose.Schema({
      name: String
    }));

    expect(Person).to.be.a('function');
    expect(Person).to.have.property('name');
  });

  it('should retrieve a model', async function () {
    const Person = db.clients.get('default').connection.model('person');

    expect(Person).to.be.a('function');
    expect(Person).to.have.property('name');
  });

  it('should handle multiple named connections', async function () {
    for (const name of servers.keys()) {
      db.add(name, {
        ...config,
        uri: await servers.get(name).getConnectionString()
      });

      expect(db.clients.has(name)).to.be.true;
      expect(db.clients.get(name)).to.be.an('object');
      expect(db.clients.get(name).connection).to.be.null;

      const conn = await db.connect(name);

      expect(db.clients.get(name).connection).to.be.deep.equal(conn);
      expect(conn).to.be.an('object');
      expect(conn).to.be.an.instanceof(mongoose.Connection);
      expect(conn.readyState).to.equal(1);
    }

    // Check uniqueness
    for (const srv of servers.keys()) {
      for (const cnn of db.clients.keys()) {
        if (srv !== cnn) {
          expect(db.clients.get(cnn)).to.not.be.deep.equal(db.clients.get(srv));
        }
      }
    }
  });

  it('should list all keys', function () {
    const keys = [...db.clients.keys()];

    expect(keys).to.be.an('array');
    expect(keys).to.have.length.of.at.least(1);
  });

  it('should list all entries', function () {
    const entries = [...db.clients.entries()];

    expect(entries).to.be.an('array');
    expect(entries).to.have.length.of.at.least(1);
  });

  it('should list all values', function () {
    const clients = [...db.clients.values()];

    expect(clients).to.be.an('array');
    expect(clients).to.have.length.of.at.least(1);
  });

  it('should disconnect the default from the database', async function () {
    await db.disconnect('default');

    expect(db.connection('default')).to.be.null;
  });

  it('should disconnect all from the database', async function () {
    await db.disconnectAll();
  });

  after(async function () {
    await mongoose.disconnect();
    await db.disconnectAll(true);

    for (const server of servers.keys()) {
      await servers.get(server).stop();
    }
  });
});
