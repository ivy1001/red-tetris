import { Module } from '@nestjs/common';
import { GameGateway } from './game/game.gateway';
import { ScoreBoard } from './scores';

@Module({ providers: [GameGateway, ScoreBoard] })
export class AppModule {}
