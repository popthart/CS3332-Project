BEGIN TRANSACTION;
DROP TABLE IF EXISTS "Message";
CREATE TABLE "Message" (
                           "messageID" INTEGER,
                           "userID" INTEGER NOT NULL,
                           "messageText" TEXT,
                           "messageAttachment" BLOB,
                           "timeStamp" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                           PRIMARY KEY("messageID" AUTOINCREMENT),
                           FOREIGN KEY("userID") REFERENCES "User"("userID") ON DELETE CASCADE
);
DROP TABLE IF EXISTS "Pass";
CREATE TABLE "Pass" (
                        "userID" INTEGER,
                        "passHash" TEXT NOT NULL,
                        PRIMARY KEY("userID"),
                        FOREIGN KEY("userID") REFERENCES "User"("userID") ON DELETE CASCADE
);
DROP TABLE IF EXISTS "User";
CREATE TABLE "User" (
                        "userID" INTEGER,
                        "displayName" TEXT NOT NULL UNIQUE,
                        "isActive" INTEGER NOT NULL DEFAULT 1,
                        "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        "email" TEXT NOT NULL,
                        PRIMARY KEY("userID" AUTOINCREMENT)
);
COMMIT;
