import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import cookieParser from "cookie-parser";
import helmet from "helmet";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === "production" ? ["error", "warn", "log"] : ["debug", "error", "warn", "log"],
  });

  app.use(helmet({
    contentSecurityPolicy: false, // adjusted by Caddy / frontend
  }));
  app.use(cookieParser());

  app.enableCors({
    origin: process.env.INSTANCE_URL || true,
    credentials: true,
  });

  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Horizon API listening on port ${port}`);
}

bootstrap().catch((err) => {
  console.error("Failed to start API:", err);
  process.exit(1);
});
