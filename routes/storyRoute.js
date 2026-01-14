//  routes/storyRoute.js
module.exports = async function (fastify, opts) {
  const storiesCollection = fastify.mongo.db.collection('stories');

  // --- Route xem chi tiết truyện ---
  fastify.get('/story/:id', async (req, reply) => {
    const { id } = req.params;
    const { ObjectId } = fastify.mongo;//chuoi-id(trongmongo la obj nen phai chuyen sang chuoi)

    try {
      const story = await storiesCollection.findOne({ _id: new ObjectId(id) });
      if (!story) {
        return reply.code(404).send({ error: 'Không tìm thấy truyện' });
      }

      return reply.view('storyDetail.pug', { story });
    } catch (err) {
      reply.code(500).send({ error: 'Lỗi khi tải truyện' });
    }
  });

  // --- Route gửi bình luận ---
  fastify.post('/story/:id/comment', async (req, reply) => {
    const { id } = req.params;
    const { text } = req.body;
    const { ObjectId } = fastify.mongo;

    try {
      //  Kiểm tra đăng nhập (JWT từ cookie)
      const token = req.cookies.token;
      if (!token) {
        return reply.redirect('/'); // quay lại login nếu chưa đăng nhập
      }

      const decoded = fastify.jwt.verify(token);//giải mã,kiểm tra token

      // Tạo bình luận mới
      const comment = {
        username: decoded.username,
        text,
        createdAt: new Date()
      };

      // Lưu bình luận vào truyện
      await storiesCollection.updateOne(
        //dkien
        { _id: new ObjectId(id) },
        { $push: { comments: comment } }
      );

      // Quay lại trang truyện sau khi gửi
      reply.redirect(`/story/${id}`);
    } catch (err) {
      console.error(err);
      reply.code(500).send({ error: 'Lỗi khi gửi bình luận' });
    }
  });
};
