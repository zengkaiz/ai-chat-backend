import { makeExecutableSchema } from '@graphql-tools/schema'
import { resolvers } from '../resolvers'

// GraphQL Type Definitions
const typeDefs = `
  type Message {
    id: ID!
    role: String!
    content: String!
    timestamp: String!
  }

  type Conversation {
    id: ID!
    title: String!
    messages: [Message!]!
    createdAt: String!
    updatedAt: String!
  }

  type Query {
    conversations: [Conversation!]!
    conversation(id: ID!): Conversation
  }

  type Mutation {
    createConversation(title: String): Conversation!
    sendMessage(conversationId: ID!, message: String!): Message!
    deleteConversation(id: ID!): Boolean!
  }
`

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})
