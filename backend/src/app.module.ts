import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from './modules/users/users.module';
import { UserProfilesModule } from './modules/user_profiles/user_profiles.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { SavingsGoalsModule } from './modules/savings_goals/savings_goals.module';
import { BillsModule } from './modules/bills/bills.module';
import { ConnectionsModule } from './modules/connections/connections.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { MessageHistoryModule } from './modules/message-history/message-history.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { AuthModule } from './modules/auth/auth.module';
import { EventsModule } from './common/events/events.module';
import { AiModule } from './modules/ai/ai.module';
import { KeepaliveModule } from './keepalive/keepalive.module';

import { APP_INTERCEPTOR } from '@nestjs/core';
import { CurrentUserInterceptor } from './common/interceptors/current-user.interceptor';
import { ChatModule } from './modules/chat/chat.module';
import { SeedService } from './seed.service';
import { Category } from './modules/categories/categories.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env', 'backend/.env'],
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        autoLoadEntities: true,
        logging: false,
        // Force SSL for Supabase and accept self-signed/intercepted certs
        ssl: { rejectUnauthorized: false },
        extra: { ssl: { rejectUnauthorized: false } },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Category]),
    KeepaliveModule,
    EventsModule,
    UsersModule,
    UserProfilesModule,
    BudgetsModule,
    ExpensesModule,
    SavingsGoalsModule,
    BillsModule,
    ConnectionsModule,
    InvitationsModule,
    ConversationsModule,
    MessageHistoryModule,
    NotificationsModule,
    CategoriesModule,
    AuthModule,
    ChatModule,
    AiModule,
  ],
  // When DI-dependent interceptor is needed globally, provide it here
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: CurrentUserInterceptor, // Nest will inject UsersService automatically
    },
    SeedService,
  ],
})
export class AppModule {}
