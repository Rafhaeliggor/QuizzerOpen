import { Module } from '@nestjs/common';
import { ChavesIntegracaoService } from './chaves-integracao.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { ContaController, PermissoesController } from './conta.controller.js';
import { ContaService } from './conta.service.js';
import { MfaService } from './mfa.service.js';
import { PermissoesService } from './permissoes.service.js';
import { RecuperacaoService } from './recuperacao.service.js';
import { SenhaService } from './senha.service.js';
import { SessaoService } from './sessao.service.js';

@Module({
  controllers: [AuthController, ContaController, PermissoesController],
  providers: [AuthService, MfaService, SenhaService, SessaoService, ContaService, PermissoesService, RecuperacaoService, ChavesIntegracaoService],
  exports: [SenhaService, SessaoService, PermissoesService, RecuperacaoService, ChavesIntegracaoService],
})
export class IamModule {}
