-- 取得後の同時更新を検知する保存世代を追加する。既存行は0から開始する。
ALTER TABLE "requests" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
