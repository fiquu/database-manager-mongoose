# @fiquu/database-manager-mongoose

[![Build Status](https://travis-ci.org/fiquu/database-manager-mongoose.svg?branch=master)](https://travis-ci.org/fiquu/database-manager-mongoose)
![GitHub](https://img.shields.io/github/license/fiquu/database-manager-mongoose)
![GitHub last commit](https://img.shields.io/github/last-commit/fiquu/database-manager-mongoose)
![npm (scoped)](https://img.shields.io/npm/v/@fiquu/database-manager-mongoose)
![npm](https://img.shields.io/npm/dw/@fiquu/database-manager-mongoose)

Database connections manager with Mongoose.

## Installation

```sh
npm i @fiquu/database-manager-mongoose
```

## Usage

It's recommended to use it as a singleton instance in your project, so you can use the manager from any module.

`./configs/database.ts`:

```ts
import { DatabaseClientConfig } from '@fiquu/database-manager-mongoose';

const config: DatabaseClientConfig = {
  uri: 'mongodb://localhost:27017/test',
  options: {
    // Mongoose connection options here...
  }
};

export default [
  {
    name: 'default',
    config
  }

  // You could add more clients if necessary...
]
```

`./components/database.ts`:

```ts
import { createDatabaseManager } from '@fiquu/database-manager-mongoose';

import config from '../configs/database';

const manager = createDatabaseManager();

for (let client of config) {
  manager.add(client);
}

export default manager;
```

`./some/other/module.ts`:

```ts
import db from '../../components/database';

// Ensure the 'default' client is connected...
db.connect('default');

// ...

const User = db.connection('default').model('User');
const user = await User.create({
  //...
});

// ...
```

## Documentation

Please visit [the documentation page](https://fiquu.github.io/database-manager-mongoose/) for more info and options.
