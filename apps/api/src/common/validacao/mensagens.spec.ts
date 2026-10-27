import { IsInt, IsString, MaxLength, Min, ValidateNested, validateSync } from 'class-validator';
import { plainToInstance, Type } from 'class-transformer';
import { mensagensDeValidacao } from './mensagens.js';

class Item {
  @IsString() nome!: string;
}
class Dto {
  @IsInt() @Min(1) pagina!: number;
  @IsString() @MaxLength(5) codigo!: string;
  @MaxLength(3, { message: 'Sigla muito longa' }) sigla!: string;
  @ValidateNested() @Type(() => Item) item!: Item;
}

const validar = (o: object) =>
  mensagensDeValidacao(validateSync(plainToInstance(Dto, o), { whitelist: true, forbidNonWhitelisted: true }));

describe('mensagens de validação em português', () => {
  it('traduz as padrão, mantém as personalizadas e inclui campos aninhados', () => {
    const m = validar({ pagina: 0, codigo: 'muito longo', sigla: 'ABCD', item: { nome: 3 }, extra: 1 });
    expect(m).toEqual(
      expect.arrayContaining([
        'pagina deve ser no mínimo 1',
        'codigo deve ter no máximo 5 caracteres',
        'Sigla muito longa',
        'item.nome deve ser um texto',
        'Campo não permitido: extra',
      ]),
    );
    expect(m.some((x) => /must|should/.test(x))).toBe(false);
  });
});
