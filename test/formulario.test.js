import assert from 'node:assert/strict';
import test from 'node:test';
import { formatField } from '../public/ui/formulario.js';

test('CPF e CEP recebem a mesma máscara ao digitar, colar ou reabrir o cadastro', () => {
  for (const [key, raw, expected] of [
    ['cpf', '52998224725', '529.982.247-25'],
    ['cpf', '5299', '529.9'],
    ['cep', '01001000', '01001-000'],
    ['cep', '01001', '01001'],
    ['cnpj', '12abc34501de35', '12.ABC.345/01DE-35'],
    ['cnpj', '04252011000110', '04.252.011/0001-10'],
    ['cnpj', '12ab', '12.AB'],
    ['state', 'pe', 'PE'],
  ]) {
    assert.equal(formatField(key, raw), expected);
    assert.equal(formatField(key, expected), expected);
  }
});
test('telefone preserva DDD, fixos, celulares e números com código do país', () => {
  for (const [raw, expected] of [
    ['8134567890', '(81) 3456-7890'],
    ['81987654321', '(81) 98765-4321'],
    ['+5581987654321', '+55 (81) 98765-4321'],
    ['558134567890', '+55 (81) 3456-7890'],
    ['+14155550123', '+14155550123'],
    ['', ''],
  ]) {
    assert.equal(formatField('phone', raw), expected);
    assert.equal(formatField('phone', expected), expected);
  }
});
