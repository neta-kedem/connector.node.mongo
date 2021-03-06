/**
 * Created by nitzan on 21/02/2017.
 */

import * as shared from "./shared";
import * as connector from "@fugazi/connector";

const COMMANDS = [] as Array<(module: connector.components.ModuleBuilder) => void>;

export function init(parentModule: connector.components.ModuleBuilder): void {
	const module = parentModule.module("collections")
		.type({
			"name": "collections",
			"type": "list<collection>"
		})
		.type({
			"name": "document",
			"type": "map"
		});

	COMMANDS.forEach(fn => fn(module));
}

type MongoListCollectionsResult = Array<{ name: string; options: any; }>;
function list(request: connector.server.Request): Promise<shared.Collection[]> {
	return shared.db(request.data("dbname")).then(db => {
		return (db.listCollections({}).toArray() as Promise<MongoListCollectionsResult>).then(collections => collections.map(collection => ({ name: collection.name })));
	});
}
COMMANDS.push((module: connector.components.ModuleBuilder) => {
	module
		.command("list", {
			title: "returns all of the collections in a db",
			returns: "collections",
			syntax: [
				"list collections",
				"list collections in (dbname string)"
			]
		})
		.endpoint("{ dbname }/collections")
		.handler(shared.createHandler(list));
});

function create(request: connector.server.Request): Promise<shared.Collection> {
	return shared.db(request.data("dbname")).then(db => {
		return db.createCollection(request.data("collectionName")).then(collection => ({ name: collection.collectionName }));
	});
}
COMMANDS.push((module: connector.components.ModuleBuilder) => {
	module
		.command("create", {
			title: "creates a new collection",
			returns: "collection",
			syntax: [
				"create collection (collectionName string)",
				"create collection (collectionName string) in (dbname string)"
			]
		})
		.endpoint("{ dbname }/collections/create/{ collectionName }")
		.handler(shared.createHandler(create));
});

type Document = {
	[key: string]: any;
}
type SavedDocument = Document & { _id: string };
function insertOne(request: connector.server.Request): Promise<SavedDocument> {
	let doc = request.data("doc");

	if (typeof doc === "string") {
		doc = JSON.parse(doc);
	}

	return shared.db(request.data("dbname")).then(db => {
		return db
			.collection(request.data("collectionName"))
			.insertOne(doc)
			.then(result => Object.assign({}, doc, { _id: result.insertedId }));
	});
}
COMMANDS.push((module: connector.components.ModuleBuilder) => {
	module
		.command("insertOne", {
			title: "inserts a document",
			returns: "map",
			syntax: [
				"insert (doc map) into collection (collectionName string)",
				"insert (doc map) into collection (collectionName string) in (dbname string)"
			]
		})
		.method("post")
		.endpoint("{ dbname }/collection/{ collectionName }/insert-one")
		.handler(shared.createHandler(insertOne));
});


function findOneEquals(request: connector.server.Request): Promise<SavedDocument> {
	let doc = request.data("doc");

	if (typeof doc === "string") {
		doc = JSON.parse(doc);
	}

	return shared.db(request.data("dbname")).then(db => {
		return db
			.collection(request.data("collectionName"))
			.findOne({ [request.data("field")]: request.data("value") });
	});
}

COMMANDS.push((module: connector.components.ModuleBuilder) => {
	module
		.command("findOneEquals", {
			title: "finds a document filtered by a single field",
			returns: "document",
			syntax: [
				"find one in collection (collectionName string) where (field string) is (value string)",
				"find one in collection (collectionName string) in (dbname string) where (field string) is (value string)"
			]
		})
		.method("post")
		.endpoint("{ dbname }/collection/{ collectionName }/findOneEquals/{ field }/is/{ value }")
		.handler(shared.createHandler(findOneEquals));
});

function find(request: connector.server.Request): Promise<SavedDocument[]> {
	const query = JSON.parse(request.data("query"));

	return shared.db(request.data("dbname")).then(db => {
		return db
			.collection(request.data("collectionName"))
			.find(query)
			.toArray();
	});
}

COMMANDS.push((module: connector.components.ModuleBuilder) => {
	module
		.command("find", {
			title: "finds documents with a query",
			returns: "list<document>",
			syntax: [
				"find in collection (collectionName string) where (query map)",
				"find in collection (collectionName string) in (dbname string) where (query map)"
			]
		})
		.method("post")
		.endpoint("{ dbname }/collection/{ collectionName }/find/{ query }")
		.handler(shared.createHandler(find));
});
