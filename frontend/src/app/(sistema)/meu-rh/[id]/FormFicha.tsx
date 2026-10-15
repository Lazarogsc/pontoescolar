"use client";

import { useActionState } from "react";
import { Aviso, ui } from "@/components/ui";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { lancar, salvarCadastrais, salvarProfissionais, type EstadoFicha } from "../actions";

type Campo = { nome: string; rotulo: string; tipo?: string; opcoes?: string[]; obrigatorio?: boolean };
const cadastro: Campo[] = [
  { nome: "cpf", rotulo: "CPF" }, { nome: "rg", rotulo: "RG" }, { nome: "nascimento", rotulo: "Nascimento", tipo: "date" },
  { nome: "estado_civil", rotulo: "Estado civil" }, { nome: "mae", rotulo: "Nome da mãe" }, { nome: "pai", rotulo: "Nome do pai" }, { nome: "celular", rotulo: "Celular" },
  { nome: "email", rotulo: "E-mail", tipo: "email" }, { nome: "endereco", rotulo: "Endereço" },
  { nome: "numero", rotulo: "Número" }, { nome: "complemento", rotulo: "Complemento" },
  { nome: "bairro", rotulo: "Bairro" }, { nome: "cidade", rotulo: "Cidade" },
  { nome: "uf", rotulo: "UF" }, { nome: "cep", rotulo: "CEP" },
];
const camposPorTipo: Record<string, Campo[]> = {
  profissionais: [{ nome: "cargo", rotulo: "Cargo", obrigatorio: true }, { nome: "salario_base", rotulo: "Salário base", tipo: "number", obrigatorio: true }],
  contracheque: [{ nome: "competencia", rotulo: "Competência", tipo: "month", obrigatorio: true }, ...["salario_bruto", "descontos", "inss", "irrf", "fgts"].map((nome) => ({ nome, rotulo: nome.replaceAll("_", " "), tipo: "number", obrigatorio: true }))],
  ferias: [{ nome: "inicio", rotulo: "Início", tipo: "date", obrigatorio: true }, { nome: "fim", rotulo: "Fim", tipo: "date", obrigatorio: true }, { nome: "dias_gozados", rotulo: "Dias gozados", tipo: "number", obrigatorio: true }, { nome: "dias_vendidos", rotulo: "Dias vendidos", tipo: "number" }, { nome: "status", rotulo: "Situação", obrigatorio: true }, { nome: "observacao", rotulo: "Observação" }],
  beneficio: [{ nome: "tipo", rotulo: "Tipo", obrigatorio: true }, { nome: "descricao", rotulo: "Descrição" }, { nome: "operadora", rotulo: "Operadora" }, { nome: "valor", rotulo: "Valor", tipo: "number", obrigatorio: true }],
  diaria: [{ nome: "destino", rotulo: "Destino", obrigatorio: true }, { nome: "motivo", rotulo: "Motivo", obrigatorio: true }, { nome: "inicio", rotulo: "Início", tipo: "date", obrigatorio: true }, { nome: "fim", rotulo: "Fim", tipo: "date", obrigatorio: true }, { nome: "valor_diaria", rotulo: "Valor por dia", tipo: "number", obrigatorio: true }, { nome: "processo", rotulo: "Processo" }],
  treinamento: [{ nome: "titulo", rotulo: "Título", obrigatorio: true }, { nome: "instituicao", rotulo: "Instituição" }, { nome: "modalidade", rotulo: "Modalidade", opcoes: ["Interno", "Externo"] }, { nome: "carga_horaria", rotulo: "Carga horária", tipo: "number", obrigatorio: true }, { nome: "conclusao", rotulo: "Conclusão", tipo: "date" }, { nome: "status", rotulo: "Situação", opcoes: ["Concluído", "Em andamento"] }],
};

export function FormFicha({ tipo, id, valores, estadosCivis = [], statusFerias = [], tiposBeneficio = [] }: {
  tipo: string; id: string; valores: Record<string, string | number>; estadosCivis?: string[]; statusFerias?: string[]; tiposBeneficio?: string[];
}) {
  const acao = tipo === "cadastrais" ? salvarCadastrais.bind(null, id) : tipo === "profissionais" ? salvarProfissionais.bind(null, id) : lancar.bind(null, id, tipo);
  const [estado, formAction] = useActionState<EstadoFicha, FormData>(acao, { tentativa: 0 });
  const campos = tipo === "cadastrais" ? cadastro : camposPorTipo[tipo];
  return <form action={formAction} className={ui.form}>
    <h3>{tipo === "cadastrais" ? "Atualizar cadastro" : tipo === "profissionais" ? "Atualizar dados profissionais" : "Registrar lançamento"}</h3>
    {estado.ok && <Aviso tom="ok">{estado.ok}</Aviso>}
    {estado.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
    <div className={ui.campos} key={estado.tentativa}>
      {campos.map((campo) => {
        const opcoes = campo.nome === "estado_civil" ? estadosCivis : campo.nome === "status" && tipo === "ferias" ? statusFerias : campo.nome === "tipo" && tipo === "beneficio" ? tiposBeneficio : campo.opcoes;
        return <label className={ui.campo} key={campo.nome}>{campo.rotulo}
          {opcoes ? <select name={campo.nome} defaultValue={String(valores[campo.nome] ?? opcoes[0] ?? "")} required={campo.obrigatorio}>{opcoes.map((o) => <option key={o}>{o}</option>)}</select>
            : <input name={campo.nome} type={campo.tipo ?? "text"} step={campo.tipo === "number" ? "0.01" : undefined} defaultValue={String(valores[campo.nome] ?? "")} required={campo.obrigatorio} />}
        </label>;
      })}
    </div>
    <BotaoEnviar enviando="Salvando…">Salvar</BotaoEnviar>
  </form>;
}
