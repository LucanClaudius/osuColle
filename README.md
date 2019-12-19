# osuColle
A simple node module to create, read and modify osu! beatmap collections.

## Installation
This module is available as an npm package
```sh
npm install osucolle
```

## Usage
### Reading a database from a buffer.
```js
const osuColle = require("osucolle");
const fs = require("fs");

//read your database file
let buffer = fs.readFileSync("./collection.db");
//convert the buffer to a database object
let database = buffer.readDatabase();

console.log(database);
```
Result:
```
{
    version:    20191211            //osu version
    size:       2                   //amount of collections in this database
    collections: {                  //collections in this database
        collection1: {
            name:   "collection1",  //name of the collection
            size:   3,              //amount of beatmaps in this collection
            hashes: [               //list of MD5 hashes of the beatmaps
                "c8f08438204abfcdd1a748ebfae67421",
                ...,
                ...
            ]
        },
        ...: {
            ...
        }
    }
}
```

Reading a single collection
```js
const osuColle = require("osucolle");
const fs = require("fs");

let buffer = fs.readFileSync("./collection.db");
let database = buffer.readDatabase();

//find a collection by name
let collectionName = "collection1";
let myCollection = database.collection(collectionName);

console.log(myCollection);
```
Result:
```
{
    name:   "collection1",  //name of the collection
    size:   3,              //amount of beatmaps in this collection
    hashes: [               //list of MD5 hashes of the beatmaps
        "c8f08438204abfcdd1a748ebfae67421",
        ...,
        ...
    ]
}
```

### Creating a database
```js
const osuColle = require("osucolle");
//construct a database
const myDatabase = new osuColle.Database();

//add a collection to the database
let collectionName = "My Collection";

myDatabase.appendCollection(collectionName);

//add a beatmap to My Collection
//a beatmap's MD5 hash can be found through the official osu! api, or in a local beatmap database.
let hash = "c8f08438204abfcdd1a748ebfae67421";

myDatabase.collection(collectionName)
    .appendBeatmap(hash);

console.log(myDatabase);
```
Result:
```
{
    version:    20191211                //osu version
    size:       1                       //amount of collections in this database
    collections: {                      //collections in this database
        My Collection: {
            name:   "My Collection",    //name of the collection
            size:   1,                  //amount of beatmaps in this collection
            hashes: [                   //list of MD5 hashes of the beatmaps
                "c8f08438204abfcdd1a748ebfae67421"
            ]
        }
    }
}
```

To export the database, convert it to a buffer and save the result.
```js
//convert myDatabase to a buffer
let myBuffer = myDatabase.toBuffer();

//then save the buffer to ./collection.db
fs.writeFileSync("./collection.db", myBuffer);
```

### Modifying an existing database:
```js
const osuColle = require("osucolle");
const myDatabase = new osuColle.Database();

let collectionName = "My Collection";
let hash = "c8f08438204abfcdd1a748ebfae67421";

myDatabase.appendCollection(collectionName);
myDatabase.collection(collectionName)
    .appendBeatmap(hash);

//change the name of a collection
let newCollectionName = "My New Collection";

myDatabase.changeCollectionName(collectionName, newCollectionName);

//remove a beatmap from a collection
myDatabase.collection(newCollectionName)
    .removeBeatmap(hash);

//remove a collection from a database
myDatabase.removeCollection(newCollectionName);
```

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details