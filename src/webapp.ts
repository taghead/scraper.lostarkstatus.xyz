import Koa, { Context } from "koa";

interface MyContext extends Context {
  body: {
    status: "HEALTHY";
  };
}

const app = new Koa();

app.use((ctx: MyContext) => {
  ctx.body = {
    status: "HEALTHY",
  };
});

export default app;
