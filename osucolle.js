const Parser = require("binary-parser-encoder").Parser;

const osuColle = module.exports;

const OSU_VERSION = 20191211;

const headParser = new Parser()
    .endianess("little")
    .uint32le("version")
    .uint32le("size");

const nameSizeParser = new Parser()
    .endianess("little")
    .skip(1)
    .string("size", {encoding: "utf8", length: 1});

const beatmapParser = new Parser()
    .string("md5_hash", {length: 32});

const stringPrefixParser = new Parser()
    .string("stringPrefix", {encoding: "utf8", length: 2});

const stringPrefix = {
    stringPrefix: "\u000b "
};

/*
    Creates a new database object
    @constructor
    @param { number } version - current osu version (optional, )
*/
function Database (version = OSU_VERSION) {
    version = Number(version);
    if (isNaN(version))
        throw TypeError("provide version as a number");

    this.version = version;
    this.size = 0;
    this.collections = {};

    return this;
};

/*
    Creates a collection
    @constructor
    @param { string }; name - name for the collection
*/
function Collection (name) {
    if (!name || !typeof(name) === "String" || name == "" || name.length > 25)
        throw TypeError("provide a name between 1 and 25 characters");

    this.name = name;
    this.size = 0;
    this.hashes = [];

    return this;
};

/*
    Calls collection constructor and adds collection to the database
    @method
    @param { string } name - name for the collection
*/
Database.prototype.appendCollection = function (name) {
    this.collections[name] = new Collection(name);
    this.size += 1;

    return this;
};

/*
    remove collection from database
    @method
    @param { string } name - name of the collection to remove
*/
Database.prototype.removeCollection = function (name) {
    if (!this.collections[name])
        throw TypeError("collection name not found in this database");

    delete this.collections[name];
    this.size -= 1;

    return this;
};

Database.prototype.collection = function (name) {
    return this.collections[name];
}

/*
    convert database to a stream of binary data, which can be saved to a .db file
    @method
*/
Database.prototype.toBuffer = function () {
    if (this.size === 0)
        return TypeError("no collections in this database");

    //individual buffers are saved in the buffers variable, to be combined later
    let database = this;
    let buffers = [];

    //add non-repeated data to buffers
    let head = {
        version: database.version,
        size: database.size
    }
    buffers.push(headParser.encode(head));

    //loop through collections and add them to the database
    Object.keys(database.collections).forEach(key => {
        if (database.collections[key].size === 0)
            return TypeError("empty collection in database");

        //convert collection name size and create a parser for the collection
        let nameSize = String.fromCharCode(database.collections[key].name.length);

        let collectionParser = new Parser()
            .string("nameSize", {encoding: "utf8", length: 2})
            .string("name", {encoding: "utf8", length: database.collections[key].name.length})
            .uint32le("size");

        let collection = {
            nameSize: `\u000b${nameSize}`,
            name: database.collections[key].name,
            size: database.collections[key].size
        }
        buffers.push(collectionParser.encode(collection));

        //loop through hashes and add them to the collection
        database.collections[key].hashes.forEach(hash => {
            buffers.push(stringPrefixParser.encode(stringPrefix));

            let beatmap = {
                md5_hash: hash
            }
            buffers.push(beatmapParser.encode(beatmap));
        });
    });

    return Buffer.concat(buffers);
};

/*
    Add a beatmap hash to the collection
    @method
    @param { string } hash - MD5 hash of the beatmap to be added
*/
Collection.prototype.appendBeatmap = function (hash) {
    if (!hash || !typeof(hash) === "String" || hash == "" || !hash.match(/^[a-f0-9]{32}$/))
        throw TypeError("provide a valid beatmap md5 hash");

    this.hashes.push(hash);
    this.size += 1;

    return this;
};

/*
    Remove a beatmap hash from the collection
    @method
    @param { string } hash - MD5 hash of the beatmap to remove
*/
Collection.prototype.removeBeatmap = function (hash) {
    if (!this.hashes.includes(hash))
        throw TypeError("beatmap hash not found in this collection");

    this.hashes.splice(this.hashes.indexOf(hash), 1);
    this.size -= 1;

    return this;
};

/*
    Reads a buffer and converts it to a database object
    @method
*/
Buffer.prototype.readCollection = function () {
    //create database and add non-repeated data
    let database = new Database();
    let head = headParser.parse(this);
    
    database.version = head.version;

    //slice buffer to remove bits already parsed
    let buffer = this.slice(8);

    //bits will continue to be sliced untill the buffer is empty
    while (buffer.length > 0) {
        //convert collection name size and create a parser for the collection, then add the parsed collection to the database
        let nameSize = nameSizeParser.parse(buffer).size.charCodeAt(0);

        let collectionParser = new Parser()
            .skip(2)
            .string("name", {encoding: "utf8", length: nameSize})
            .uint32le("size");

        let collection = collectionParser.parse(buffer);

        if (collection.name.length > 25 || collection.size == 0)
            throw TypeError("database is malformed");

        database.appendCollection(collection.name);

        buffer = buffer.slice(8 + nameSize);
        
        //loop through beatmap hashes and add them to the collection
        for (i = 0; i < collection.size; i++) {
            let hash = beatmapParser.parse(buffer);

            if (!hash.md5_hash.match(/^[a-f0-9]{32}$/))
                throw TypeError("database is malformed");

            database.collections[collection.name].appendBeatmap(hash.md5_hash);
            
            buffer = buffer.slice(34);
        };
    };

    return database;
};

//exports

osuColle.Database = Database;