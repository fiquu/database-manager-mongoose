# database-manager-mongoose

Database connections manager with Mongoose.

## Instalation

```sh
npm i @fiquu/database-manager-mongoose
```

## Usage

It's recommended to use it as a singleton instance in your project, so you can use the manager from any module.

`./configs/database.ts`:
```ts
import { DatabaseClient } from '@fiquu/database-manager-mongoose';

const config: DatabaseClient = {
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

## API Docs
Please visit https://fiquu.github.io/database-manager-mongoose/
