const {
  ApolloServer,
  UserInputError,
  AuthenticationError,
  gql,
} = require("apollo-server");
// const { v1: uuid } = require("uuid");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Book = require("./models/book");
const Author = require("./models/author");
const User = require("./models/user");
require("dotenv").config();

const url = process.env.MONGODB_URI;
const jwt_secret = process.env.JWT_SECRET;
const hardcoded_password = process.env.PASSWORD;

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
  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }

  type Token {
    value: String!
  }

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
    me: User
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
    createUser(username: String!, favoriteGenre: String!): User
    login(username: String!, password: String!): Token
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
    },
    me: (root, args, context) => {
      return context.currentUser;
    },
  },
  Mutation: {
    addBook: async (root, args, context) => {
      // Check if user is logged in.
      const currentUser = context.currentUser;
      if (!currentUser) {
        throw new AuthenticationError("Not authenticated.");
      }
      // Check if author exists.
      let author = await Author.findOne({ name: args.authorName });
      // Create and save new author if they do not exist.
      if (!author) {
        author = new Author({
          name: args.authorName,
          born: args.authorBorn,
        });
        try {
          await author.save();
        } catch (error) {
          throw new UserInputError(error.message, {
            invalidArgs: args,
          });
        }
      }
      // Create and save new book.
      const book = new Book({
        title: args.title,
        published: args.published,
        author: author,
        genres: args.genres,
      });
      try {
        await book.save();
      } catch (error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        });
      }
      return book;
    },
    editAuthor: async (root, args, context) => {
      // Check if user is logged in.
      const currentUser = context.currentUser;
      if (!currentUser) {
        throw new AuthenticationError("Not authenticated.");
      }
      const author = await Author.findOne({ name: args.name });
      author.born = args.setBornTo;
      return await author.save();
    },
    createUser: async (root, args) => {
      const user = new User({ ...args });

      return await user.save().catch((error) => {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        });
      });
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username });

      if (!user || args.password !== hardcoded_password) {
        throw new UserInputError("wrong credentials");
      }

      const userForToken = {
        username: user.username,
        id: user._id,
      };

      return { value: jwt.sign(userForToken, jwt_secret) };
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null;
    if (auth && auth.toLowerCase().startsWith("bearer ")) {
      const decodedToken = jwt.verify(auth.substring(7), jwt_secret);
      const currentUser = await User.findById(decodedToken.id);
      return { currentUser };
    }
  },
});

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
