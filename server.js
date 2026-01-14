const fastify = require('fastify')({ logger: true });
const path = require('path');
fastify.register(require('@fastify/formbody'));//form
const fastifyView = require("@fastify/view")
fastify.register(require('@fastify/cookie')); // để đọc / ghi cookie
fastify.register(require('@fastify/multipart'));//file


//dang ki plugin va tao key bi mat
fastify.register(require('@fastify/jwt'), {
  secret: 'key1'
})

fastify.register(require('@fastify/mongodb'), {
  // force to close the mongodb connection when app stopped
  // the default value is false
  forceClose: true,

  url: 'mongodb://127.0.0.1:27017/dreamland',

})
fastify.register(fastifyView, {
    engine: {
        pug: require("pug"),
    },
    root: "./views",
})
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
   prefix: '/',
})



// Middleware xác thực JWT từ cookie
fastify.decorate("verifyJWT", async (req, reply) => {
  try {
    const token = req.cookies.token; // lấy token từ cookie
    if (!token) {
      return reply.code(401).send({ error: 'Thiếu token' });
    }

    // Xác thực token
    const decoded = fastify.jwt.verify(token);
    req.user = decoded; // gắn user info vào req
  } catch (err) {
    reply.code(401).send({ error: 'Token không hợp lệ hoặc hết hạn' });
  }
});

// Middleware kiểm tra quyền admin
fastify.decorate("verifyAdmin", async (req, reply) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return reply.code(401).send({ error: 'Thiếu token' });
    }

    const decoded = fastify.jwt.verify(token);
    req.user = decoded;

    if (decoded.role !== 'admin') {
      return reply.code(403).send({ error: 'Bạn không có quyền truy cập' });
    }
  } catch (err) {
    reply.code(401).send({ error: 'Token không hợp lệ hoặc hết hạn' });
  }
});

const addStoryRoute = require('./routes/addStoryRoute');
fastify.register(require('./routes/storyRoute'));
fastify.register(addStoryRoute);

fastify.register(require('./routes/userList'));
// Đăng ký
fastify.post('/signup', async (req, reply) => {
  const { username, password, role } = req.body
  const users = fastify.mongo.db.collection('users')

  const nameUser = await users.findOne({ username })
  if (nameUser) {
    return reply.code(400).send({ error: 'Tên người dùng đã tồn tại' })
  }

  // role mặc định là user nếu không truyền
  await users.insertOne({ username, password, role: role || 'user' })
  reply.send({ message: 'Đăng ký thành công!' })
})

//  Đăng nhập
fastify.post('/login', async (req, reply) => {
  const { username, password } = req.body
  const users = fastify.mongo.db.collection('users')

  const user = await users.findOne({ username, password })
  if (!user) {
    return reply.code(400).send({ error: 'Sai tên đăng nhập hoặc mật khẩu' })
  }

  // Gắn role vào token
  const token = fastify.jwt.sign({ username, role: user.role })
  reply
    .setCookie('token', token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 3600, // 1 giờ
    })
    .send({ message: 'Đăng nhập thành công' })
})

// Route bình thường (chỉ cần đăng nhập)
fastify.get('/profile', { preHandler: [fastify.verifyJWT] }, async (req, reply) => {
  reply.send({ message: `Xin chào ${req.user.username} (${req.user.role})!` })
})

// Route chỉ cho admin
fastify.get('/admin', { preHandler: [fastify.verifyAdmin] }, async (req, reply) => {
  reply.send({ message: `Chào admin ${req.user.username}, bạn có toàn quyền!` })
})
//route trang chu
fastify.get('/', (req, reply) => {
  reply.view('login.pug');
});
fastify.get('/signup', (req, reply) => {
  reply.view('signup.pug');
});
fastify.get('/logout', async (req, reply) => {
  // Xóa cookie chứa JWT token
  reply.clearCookie('token')
  reply.redirect('/')
})

fastify.get('/home', async (req, reply) => {
  const storiesCollection = fastify.mongo.db.collection('stories');

  const query = req.query.q; // Lấy từ khóa từ ô tìm kiếm

  let stories;//bien rong

  if (query) {
    // Nếu có từ khóa tìm kiếm
    stories = await storiesCollection
      .find({ title: { $regex: query, $options: 'i' } }) // tìm tên có chứa quẻy, không phân biệt hoa/thường
      .toArray();
  } else {
    // Nếu không tìm kiếm thì lấy 4 truyện mới nhất
    stories = await storiesCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(4)
      .toArray();
  }

  return reply.view('home.pug', {
    title: 'Trang đọc truyện',
    stories
  });
});



// Run the server!
fastify.listen({ port: 3000 }, (err) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
})