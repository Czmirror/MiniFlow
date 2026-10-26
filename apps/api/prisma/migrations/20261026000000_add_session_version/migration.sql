-- JWTの世代をpassword変更と照合する。既存のユーザー・passwordは変更しない。
ALTER TABLE "users" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
