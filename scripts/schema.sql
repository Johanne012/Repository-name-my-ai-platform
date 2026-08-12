-- AgenticAI full schema (matches drizzle/schema.ts)
-- Run once on a fresh MySQL / TiDB database

CREATE TABLE IF NOT EXISTS `users` (
  `id` int AUTO_INCREMENT NOT NULL,
  `openId` varchar(64) NOT NULL,
  `name` text,
  `email` varchar(320),
  `loginMethod` varchar(64),
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `subscriptionPlan` enum('free','pro','enterprise') NOT NULL DEFAULT 'free',
  `stripeCustomerId` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `lastSignedIn` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_openId_unique` (`openId`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `agents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `systemPrompt` longtext,
  `model` varchar(100) NOT NULL DEFAULT 'gpt-4o-mini',
  `status` enum('active','inactive','archived') NOT NULL DEFAULT 'active',
  `tools` json,
  `config` json,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `agents_userId_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `agentExecutions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `agentId` int NOT NULL,
  `userId` int NOT NULL,
  `input` longtext,
  `output` longtext,
  `reactLogs` json,
  `status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
  `executionTime` int,
  `tokensUsed` int,
  `cost` decimal(10,6),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completedAt` timestamp NULL,
  PRIMARY KEY (`id`),
  KEY `agentExecutions_agentId_idx` (`agentId`),
  KEY `agentExecutions_userId_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `apiKeys` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `key` varchar(255) NOT NULL,
  `keyPrefix` varchar(16) NOT NULL DEFAULT 'sk_',
  `name` varchar(255) NOT NULL,
  `lastUsed` timestamp NULL,
  `isActive` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expiresAt` timestamp NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `apiKeys_key_unique` (`key`),
  KEY `apiKeys_userId_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `plan` enum('free','pro','enterprise') NOT NULL,
  `stripeSubscriptionId` varchar(255),
  `status` enum('active','canceled','past_due') NOT NULL DEFAULT 'active',
  `currentPeriodStart` timestamp NULL,
  `currentPeriodEnd` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `subscriptions_userId_unique` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `usageTracking` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `agentExecutions` int DEFAULT 0,
  `tokensUsed` int DEFAULT 0,
  `apiCallsCount` int DEFAULT 0,
  `costAccumulated` decimal(10,6) DEFAULT '0',
  `period` varchar(20),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `usageTracking_userId_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `workflows` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `agents` json,
  `config` json,
  `status` enum('active','inactive','archived') NOT NULL DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `workflows_userId_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `workflowExecutions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `workflowId` int NOT NULL,
  `userId` int NOT NULL,
  `input` longtext,
  `output` longtext,
  `status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
  `executionLogs` json,
  `executionTime` int,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completedAt` timestamp NULL,
  PRIMARY KEY (`id`),
  KEY `workflowExecutions_workflowId_idx` (`workflowId`),
  KEY `workflowExecutions_userId_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `type` enum('execution_completed','execution_failed','workflow_completed','subscription_updated','alert') NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `data` json,
  `read` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `notifications_userId_idx` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
