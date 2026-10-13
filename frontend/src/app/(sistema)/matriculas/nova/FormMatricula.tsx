"use client";

import { useActionState, useState, type FormEvent } from "react";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Aviso, ui } from "@/components/ui";
import type { OpcoesMatricula } from "@/lib/api";
import { formatarMoeda } from "@/lib/formato";
import { matricular, type EstadoMatricula } from "../actions";

const PARENTESCOS = ["Mãe", "Pai", "Avó", "Avô", "Tio(a)", "Responsável legal"];

/** Máscaras leves: só reorganizam os dígitos enquanto a pessoa digita. */
function mascaraCpf(e: FormEvent<HTMLInputElement>) {
  const d = e.currentTarget.value.replace(/\D/g, "").slice(0, 11);
  e.currentTarget.value = d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function mascaraTelefone(e: FormEvent<HTMLInputElement>) {
  const d = e.currentTarget.value.replace(/\D/g, "").slice(0, 11);
  e.currentTarget.value = d.length > 10 ? d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3") : d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/[-\s(]+$/, "");
}

export function FormMatricula({ opcoes, atendente }: { opcoes: OpcoesMatricula; atendente: string }) {
  const [estado, acao] = useActionState<EstadoMatricula, FormData>(matricular, { tentativa: 0 });
  const v = estado.valores ?? {};
  const [turmaId, setTurmaId] = useState(v.turma_id ?? "");
  const [descontoTexto, setDescontoTexto] = useState(v.desconto ?? "0");
  const desconto = Math.min(Math.max(Number(descontoTexto) || 0, 0), 100);

  const turma = opcoes.turmas.find((t) => t.id === turmaId);
  const bruto = turma ? opcoes.mensalidades[turma.segmento] : 0;
  const parcela = Math.round(bruto * (1 - desconto / 100) * 100) / 100;

  return (
    // A key remonta o formulário com os valores devolvidos quando a API recusa algo.
    <form key={estado.tentativa} action={acao} className={ui.form}>
      {estado.erro && <Aviso tom="erro">{estado.erro}</Aviso>}

      <fieldset className={ui.secao}>
        <h3>Aluno</h3>
        <div className={ui.campos}>
          <label className={`${ui.campo} ${ui.campoLargo}`}>
            Nome completo *
            <input name="aluno_nome" required minLength={5} defaultValue={v.aluno_nome} autoComplete="off" />
          </label>
          <label className={ui.campo}>
            Data de nascimento *
            <input name="aluno_nascimento" type="date" required defaultValue={v.aluno_nascimento} />
          </label>
          <label className={ui.campo}>
            CPF do aluno <small>(opcional)</small>
            <input name="aluno_cpf" inputMode="numeric" placeholder="000.000.000-00" onInput={mascaraCpf} defaultValue={v.aluno_cpf} />
          </label>
          <label className={ui.campo}>
            Sexo
            <select name="aluno_sexo" defaultValue={v.aluno_sexo ?? "Não informado"}>
              <option>Não informado</option>
              <option>Feminino</option>
              <option>Masculino</option>
            </select>
          </label>
          <label className={ui.campo}>
            Escola anterior
            <input name="aluno_escola_anterior" defaultValue={v.aluno_escola_anterior} />
          </label>
          <label className={`${ui.campo} ${ui.campoLargo}`}>
            Observações <small>(saúde, alergias, necessidades específicas)</small>
            <textarea name="aluno_observacoes" maxLength={600} defaultValue={v.aluno_observacoes} />
          </label>
        </div>
      </fieldset>

      <fieldset className={ui.secao}>
        <h3>Responsável financeiro</h3>
        <div className={ui.campos}>
          <label className={`${ui.campo} ${ui.campoLargo}`}>
            Nome completo *
            <input name="resp_nome" required minLength={5} defaultValue={v.resp_nome} autoComplete="off" />
          </label>
          <label className={ui.campo}>
            CPF *
            <input name="resp_cpf" required inputMode="numeric" placeholder="000.000.000-00" onInput={mascaraCpf} defaultValue={v.resp_cpf} />
          </label>
          <label className={ui.campo}>
            Parentesco *
            <select name="resp_parentesco" required defaultValue={v.resp_parentesco ?? "Mãe"}>
              {PARENTESCOS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label className={ui.campo}>
            Telefone *
            <input name="resp_telefone" required inputMode="tel" placeholder="(86) 99999-0000" onInput={mascaraTelefone} defaultValue={v.resp_telefone} />
          </label>
          <label className={ui.campo}>
            E-mail *
            <input name="resp_email" type="email" required defaultValue={v.resp_email} />
          </label>
          <label className={`${ui.campo} ${ui.campoLargo}`}>
            Endereço completo *
            <input name="resp_endereco" required minLength={8} placeholder="Rua, número — bairro, cidade/UF" defaultValue={v.resp_endereco} />
          </label>
        </div>
      </fieldset>

      <fieldset className={ui.secao}>
        <h3>Turma e contrato · ano letivo {opcoes.ano_letivo}</h3>
        <div className={ui.campos}>
          <label className={ui.campo}>
            Turma *
            <select name="turma_id" required value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
              <option value="" disabled>
                Escolha a turma
              </option>
              {opcoes.turmas.map((t) => (
                <option key={t.id} value={t.id} disabled={t.vagas === 0}>
                  {t.nome} · {t.turno} — {t.vagas === 0 ? "sem vagas" : `${t.vagas} ${t.vagas === 1 ? "vaga" : "vagas"}`}
                </option>
              ))}
            </select>
          </label>
          <label className={ui.campo}>
            Tipo de matrícula
            <select name="tipo" defaultValue={v.tipo ?? "Nova"}>
              <option>Nova</option>
              <option>Rematrícula</option>
              <option>Transferência</option>
            </select>
          </label>
          <label className={ui.campo}>
            Vencimento das parcelas *
            <select name="dia_vencimento" required defaultValue={v.dia_vencimento ?? "10"}>
              {opcoes.dias_vencimento.map((d) => (
                <option key={d} value={d}>
                  Todo dia {d}
                </option>
              ))}
            </select>
          </label>
          <label className={ui.campo}>
            Desconto (%)
            <input name="desconto" type="number" min={0} max={100} step={1} value={descontoTexto} onChange={(e) => setDescontoTexto(e.target.value)} />
          </label>
          <label className={ui.campo}>
            Matrícula feita por
            <input value={atendente} readOnly aria-readonly title="Quem está logado assina o termo pela escola" />
          </label>
        </div>
      </fieldset>

      <div className={ui.rodapeForm}>
        <p className={ui.contagem}>
          {turma ? (
            <>
              Mensalidade {turma.segmento}: <strong>{formatarMoeda(bruto)}</strong>
              {desconto > 0 && <> · com {desconto}% de desconto: </>}
              {desconto > 0 && <strong>{formatarMoeda(parcela)}</strong>}
            </>
          ) : (
            "Escolha a turma para ver o valor da mensalidade."
          )}
        </p>
        <BotaoEnviar enviando="Matriculando…">Concluir matrícula</BotaoEnviar>
      </div>
    </form>
  );
}
