const { ApolloServer, UserInputError, gql } = require("apollo-server");
// const { v1: uuid } = require("uuid");
const mongoose = require("mongoose");
const Book = require("./models/book");
const Author = require("./models/author");
const User = require("./models/user");
require("dotenv").config();

const url = process.env.MONGODB_URI;

// Connect to MongoDB.
mongoose
  .connect(url)
  .then(() => {
    console.log("connected to MongoDB");
  })
  .catch((error) => {
    console.log("error connecting to MongoDB:", error.message);
  });

const typeDefs = gql`
  type Book {
    title: String!
    published: Int!
    author: Author!
    genres: [String!]!
    id: ID!
  }

  type Author {
    name: String!
    born: Int
    bookCount: Int!
    id: ID!
  }

  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book]!
    allAuthors: [Author!]!
  }

  type Mutation {
    addBook(
      title: String!
      authorName: String!
      authorBorn: Int
      published: Int!
      genres: [String!]!
    ): Book
    editAuthor(name: String!, setBornTo: Int!): Author
  }
`;

const resolvers = {
  Query: {
    bookCount: () => Book.collection.countDocuments(),
    authorCount: () => Author.collection.countDocuments(),
    allBooks: async (root, args) => {
      if (!args.author && !args.genre) {
        return await Book.find({});
      }
      return await Book.find({
        author: await Author.findOne({ name: args.author }),
        genres: args.genre,
      });
    },
    allAuthors: async (root) => {
      return await Author.find({});

      // return authors.map((author) => {
      //   const bookCount = books.reduce(
      //     (a, book) => (book.author == author.name ? a + 1 : a),
      //     0
      //   );
      //   return {
      //     name: author.name,
      //     id: author.id,
      //     born: author.born,
      //     bookCount,
      //   };
      // });
    },
  },
  Mutation: {
    addBook: async (root, args) => {
      // Check if author exists.
      let author = await Author.findOne({ name: args.authorName });
      // Create and save new author if they do not exist.
      if (!author) {
        author = new Author({
          name: args.authorName,
          born: args.authorBorn,
        });
        author.save();
      }
      // Create and save new book.
      const book = new Book({
        title: args.title,
        published: args.published,
        author: author,
        genres: args.genres,
      });
      return book.save();
    },
    editAuthor: async (root, args) => {
      const author = await Author.findOne({ name: args.name });
      author.born = args.setBornTo;
      return await author.save();
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
