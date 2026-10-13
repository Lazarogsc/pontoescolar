"use server";

import { redirect } from "next/navigation";
import { gravar } from "@/lib/api";

export type EstadoMatricula = { erro?: string; valores?: Record<string, string>; tentativa: number };

/** Envia a matrícula para a API; se der certo, vai para o comprovante com o número gerado. */
export async function matricular(anterior: EstadoMatricula, form: FormData): Promise<EstadoMatricula> {
  const v = Object.fromEntries([...form.entries()].filter(([k]) => !k.startsWith("$")).map(([k, x]) => [k, String(x).trim()]));

  const resultado = await gravar.matricula({
    aluno: {
      nome: v.aluno_nome,
      data_nascimento: v.aluno_nascimento,
      cpf: v.aluno_cpf,
      sexo: v.aluno_sexo,
      escola_anterior: v.aluno_escola_anterior,
      observacoes: v.aluno_observacoes,
    },
    responsavel: {
      nome: v.resp_nome,
      cpf: v.resp_cpf,
      parentesco: v.resp_parentesco,
      telefone: v.resp_telefone,
      email: v.resp_email,
      endereco: v.resp_endereco,
    },
    turma_id: v.turma_id,
    tipo: v.tipo,
    dia_vencimento: Number(v.dia_vencimento),
    desconto: Number(v.desconto || 0),
  });

  if (!resultado.ok) return { erro: resultado.erro, valores: v, tentativa: anterior.tentativa + 1 };
  redirect(`/matriculas/${resultado.dados.matricula}?nova=1`);
}
