import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { Db } from 'mongodb';

declare module 'fastify' {
  interface FastifyInstance {
    db: Db;
  }
}

const joinsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/transactions-with-users', async () => {
    const db = fastify.db;
    const transactions = db.collection('transactions');

    const pipeline = [
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: 'email',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: 1,
          amount: 1,
          currency: 1,
          category: 1,
          status: 1,
          createdAt: 1,
          //Create user object menthod user:{name: nameValue, email: emailValue, accountType: "accountTypeValue"}
          'user.name': 1,
          'user.email': 1,
          'user.accountType': 1,
            // flatten user object | without creating user object, inserted user objects   
          userEmail: '$user.email',
          userName: '$user.name',
          userAccountType: '$user.accountType'
        }
      }
    ];

    const results = await transactions.aggregate(pipeline).toArray();

    return {
      success: true,
      data: results,
      message: 'Joined transaction records with user profiles',
      timestamp: new Date().toISOString()
    };
  });
};

export default joinsRoutes;