import { gql } from "@apollo/client";

export const ALL_AUTHORS = gql`
  query {
    allAuthors {
      name
      born
      # bookCount
    }
  }
`;

export const ALL_BOOKS = gql`
  query {
    allBooks {
      title
      # author
      published
    }
  }
`;

export const CREATE_BOOK = gql`
  mutation createBook(
    $title: String!
    $authorName: String!
    $authorBorn: Int
    $published: Int!
    $genres: [String!]!
  ) {
    addBook(
      title: $title
      authorName: $authorName
      authorBorn: $authorBorn
      published: $published
      genres: $genres
    ) {
      title
      published
      genres
    }
  }
`;

export const LOGIN = gql`
  mutation login($username: String!, $password: String!) {
    login(username: $username, password: $password) {
      value
    }
  }
`;
