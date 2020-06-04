import ajaxRouter from "./ajaxRouter"
import apiRouter from "./apiRouter"
import {
  apolloServerExpress,
  bodyParser,
  cookieParser,
  express,
  helmet,
  responseTime,
  winston,
} from "./deps"
import resolvers from "./graphql/resolvers/index"
import typeDefs from "./graphql/typeDefs/index"
import dashboardWebSocket from "./lib/dashboardWebSocket"
import logger from "./lib/logger"
import security from "./lib/security"
import settings from "./lib/settings"
const { ApolloServer } = apolloServerExpress
const app = express()

const STATIC_OPTIONS = {
  maxAge: 31536000000, // One year
}

app.set("trust proxy", 1)
app.use(helmet())

app.get("/images/:entity/:id/:size/:filename", (req, res, next) => {
  // A stub of image resizing (can be done with Nginx)
  const newUrl = `/images/${req.params.entity}/${req.params.id}/${req.params.filename}`
  req.url = newUrl
  next()
})
app.use(express.static("public/content", STATIC_OPTIONS))

security.applyMiddleware(app)

app.all("*", (req, res, next) => {
  // CORS headers
  const allowedOrigins = security.getAccessControlAllowOrigin()
  const { origin } = req.headers
  if (allowedOrigins === "*") {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigins)
  } else if (allowedOrigins.indexOf(origin) > -1) {
    res.setHeader("Access-Control-Allow-Origin", origin)
  }

  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS")
  res.header("Access-Control-Allow-Credentials", "true")
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Key, Authorization"
  )
  next()
})

app.use(responseTime())
app.use(cookieParser(settings.cookieSecretKey))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use("/ajax", ajaxRouter)
app.use("/api", apiRouter)
app.use(logger.sendResponse)

//  graphql

const graphServer = new ApolloServer({ typeDefs, resolvers })

graphServer.applyMiddleware({ app })

app.listen({ port: 4000 }, () =>
  console.log("Now browse to http://localhost:4000" + graphServer.graphqlPath)
)
// end of graphql
const server = app.listen(settings.apiListenPort, () => {
  const serverAddress = server.address()
  winston.info(`API running at http://localhost:${serverAddress.port}`)
})

dashboardWebSocket.listen(server)
