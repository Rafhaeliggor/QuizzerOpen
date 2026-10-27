import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

/**
 * Mensagens de validação em português (BUG-053). As mensagens personalizadas dos DTOs (já em
 * português) são mantidas; só as padrão do class-validator, em inglês, são traduzidas. O formato
 * da resposta não muda: `message` continua sendo a lista de mensagens.
 */
const numero = (m: string) => m.match(/-?\d+(?:\.\d+)?/)?.[0] ?? '';

const TRADUCOES: Partial<Record<string, (campo: string, original: string) => string>> = {
  whitelistValidation: (c) => `Campo não permitido: ${c}`,
  isDefined: (c) => `${c} é obrigatório`,
  isNotEmpty: (c) => `${c} não pode ficar vazio`,
  isString: (c) => `${c} deve ser um texto`,
  isBoolean: (c) => `${c} deve ser verdadeiro ou falso`,
  isInt: (c) => `${c} deve ser um número inteiro`,
  isNumber: (c) => `${c} deve ser um número`,
  isPositive: (c) => `${c} deve ser maior que zero`,
  min: (c, m) => `${c} deve ser no mínimo ${numero(m)}`,
  max: (c, m) => `${c} deve ser no máximo ${numero(m)}`,
  minLength: (c, m) => `${c} deve ter pelo menos ${numero(m)} caracteres`,
  maxLength: (c, m) => `${c} deve ter no máximo ${numero(m)} caracteres`,
  isEmail: (c) => `${c} deve ser um e-mail válido`,
  isUuid: (c) => `${c} deve ser um identificador válido`,
  isUUID: (c) => `${c} deve ser um identificador válido`,
  isEnum: (c) => `${c} tem um valor inválido`,
  isIn: (c) => `${c} tem um valor inválido`,
  isArray: (c) => `${c} deve ser uma lista`,
  arrayMinSize: (c, m) => `${c} deve ter pelo menos ${numero(m)} item(ns)`,
  arrayMaxSize: (c, m) => `${c} deve ter no máximo ${numero(m)} item(ns)`,
  arrayNotEmpty: (c) => `${c} não pode ser uma lista vazia`,
  isObject: (c) => `${c} deve ser um objeto`,
  isDate: (c) => `${c} deve ser uma data válida`,
  isDateString: (c) => `${c} deve ser uma data válida`,
  isIso8601: (c) => `${c} deve ser uma data válida`,
  isISO8601: (c) => `${c} deve ser uma data válida`,
  isUrl: (c) => `${c} deve ser um endereço válido`,
  isURL: (c) => `${c} deve ser um endereço válido`,
  matches: (c) => `${c} está em um formato inválido`,
};

/** Mensagem padrão (inglês) do class-validator? Personalizadas, em português, não casam. */
const PADRAO_INGLES = /\b(must|should|each value in)\b/;

export function mensagensDeValidacao(erros: ValidationError[], prefixo = ''): string[] {
  const saida: string[] = [];
  for (const e of erros) {
    const campo = prefixo ? `${prefixo}.${e.property}` : e.property;
    for (const [chave, original] of Object.entries(e.constraints ?? {})) {
      const traduzir = TRADUCOES[chave];
      saida.push(traduzir && PADRAO_INGLES.test(original) ? traduzir(campo, original) : original);
    }
    if (e.children?.length) saida.push(...mensagensDeValidacao(e.children, campo));
  }
  return saida;
}

export const fabricaErroValidacao = (erros: ValidationError[]) => new BadRequestException(mensagensDeValidacao(erros));
