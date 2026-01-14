// routes/userList.js
async function userListRoutes(fastify, options) {
  const usersCollection = fastify.mongo.db.collection('users');

  // Chỉ admin mới được xem danh sách user
  fastify.get('/userList', { preHandler: [fastify.verifyAdmin] }, async (req, reply) => {
    try {
      // Lấy danh sách user từ DB
      const users = await usersCollection.find({}).toArray();

      // render ra pug
      return reply.view('userList.pug', { users, username: req.user.username });
    } catch (err) {
      console.error(err);
      return reply.status(500).send('Lỗi máy chủ');
    }
  });
   fastify.post('/userList/delete/:username', { preHandler: [fastify.verifyAdmin] }, async (req, reply) => {
    const { username } = req.params;
    if (username === req.user.username) {
      return reply.code(400).send({ error: 'Không thể tự xóa chính mình!' });
    }

    await usersCollection.deleteOne({ username });
    reply.redirect('/userList');
  });

  //  Cập nhật user (ví dụ chỉ đổi role)
  fastify.post('/userList/edit/:username', { preHandler: [fastify.verifyAdmin] }, async (req, reply) => {
    const { username } = req.params;//từ url
    const { role } = req.body;//từ form gửi

    await usersCollection.updateOne({ username }, { $set: { role } });//{ role } tương đương { role : role }
    reply.redirect('/userList');
  });
}

module.exports = userListRoutes;
