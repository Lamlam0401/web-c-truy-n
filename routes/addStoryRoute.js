const path = require('path');
const fs = require('fs');
const util = require('util');
const pump = util.promisify(require('stream').pipeline);

async function addStoryRoute(fastify, options) {

  //  Trang đăng truyện (cho cả user và admin)
  fastify.get('/addStory', { preHandler: [fastify.verifyJWT] }, async (req, reply) => {
    return reply.view('addStory.pug');
  });

  // Xử lý đăng truyện (POST)
  fastify.post('/addStory', { preHandler: [fastify.verifyJWT] }, async (req, reply) => {
    const parts = req.parts(); // Nhận tất cả các phần trong form
    let storyData = {};

    for await (const part of parts) {
      //kiem tra thuoc tinh cua part
      if (part.file) {
        // Nếu là file ảnh
        const uploadPath = path.join(__dirname, '../public/imgs', part.filename);//tao link tuyet doi
        await pump(part.file, fs.createWriteStream(uploadPath));
        storyData.cover = `uploads/${part.filename}`;
      } else {
        // Nếu là input text
        storyData[part.fieldname] = part.value;
      }
    }

    const stories = fastify.mongo.db.collection('stories');

    await stories.insertOne({
      title: storyData.title,
      content: storyData.content,
      cover: storyData.cover || 'imgs/default.jpg',//yes||no mặc định
      author: req.user.username,
      createdAt: new Date(),
    });

    return reply.redirect('/home');
  });
}

module.exports = addStoryRoute;

//part là từng phần của form multipart
//pump để chuyển dữ liệu từ luồng đọc sang luồng ghi
//path.join để tạo đường dẫn tuyệt đối an toàn
