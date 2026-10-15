"use client";

import { useActionState } from "react";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Aviso, ui } from "@/components/ui";
import type { MeusMateriais, MinhasAvaliacoes } from "@/lib/api";
import { enviarAvaliacao, enviarMaterial, publicarComunicado, type EstadoForm } from "./actions";

export function FormMaterial({ turmas, tipos, hoje, prazoHoras }: { turmas: MeusMateriais["turmas"]; tipos: string[]; hoje: string; prazoHoras: number }) {
  const [estado, acao] = useActionState<EstadoForm, FormData>(enviarMaterial, { tentativa: 0 });
  return (
    <form action={acao} className={ui.form}>
      <Aviso tom="atencao">
        O material deve ser enviado com até {prazoHoras} horas úteis de antecedência da data da atividade (sábados, domingos e feriados não
        contam).
      </Aviso>
      {estado.ok && <Aviso tom="ok">{estado.ok}</Aviso>}
      {estado.atencao && <Aviso tom="atencao">{estado.atencao}</Aviso>}
      {estado.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
      <div className={ui.campos} key={estado.tentativa}>
        <label className={ui.campo}>
          Tipo de material *
          <select name="tipo" required defaultValue="">
            <option value="" disabled>
              Lista, prova, simulado…
            </option>
            {tipos.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className={ui.campo}>
          Data da atividade *
          <input name="data" type="date" required min={hoje} />
        </label>
        <label className={ui.campo}>
          Turma *
          <select name="turma" required defaultValue="">
            <option value="" disabled>
              Escolha a turma
            </option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome} · {t.turno}
              </option>
            ))}
          </select>
        </label>
        <label className={`${ui.campo} ${ui.campoLargo}`}>
          Observação <small>(opcional)</small>
          <textarea name="observacao" maxLength={1000} rows={3} placeholder="Ex.: 30 cópias frente e verso, grampeadas" />
        </label>
        <label className={`${ui.campo} ${ui.campoLargo}`}>
          Arquivo * <small>Word (.doc, .docx) ou PDF, até 5 MB</small>
          <input
            name="arquivo"
            type="file"
            required
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          />
        </label>
      </div>
      <div className={ui.rodapeForm}>
        <span className={ui.contagem}>Vai direto para o CPD. A coordenação do CPD aprova ou reprova.</span>
        <BotaoEnviar enviando="Enviando…">Enviar ao CPD</BotaoEnviar>
      </div>
    </form>
  );
}

export function FormAvaliacao({ opcoes }: { opcoes: MinhasAvaliacoes }) {
  const [estado, acao] = useActionState<EstadoForm, FormData>(enviarAvaliacao, { tentativa: 0 });
  return (
    <form action={acao} className={ui.form}>
      {estado.ok && <Aviso tom="ok">{estado.ok}</Aviso>}
      {estado.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
      <div className={ui.campos} key={estado.tentativa}>
        <label className={ui.campo}>
          Tipo de avaliação *
          <select name="tipo" required defaultValue="">
            <option value="" disabled>
              Mensal, bimestral…
            </option>
            {opcoes.tipos.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className={ui.campo}>
          Disciplina *
          <input name="disciplina" required maxLength={60} list="disciplinas" placeholder="Ex.: Matemática" />
          <datalist id="disciplinas">
            {opcoes.disciplinas.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </label>
        <label className={ui.campo}>
          Turma *
          <select name="turma" required defaultValue="">
            <option value="" disabled>
              Escolha a turma
            </option>
            {opcoes.turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome} · {t.turno}
              </option>
            ))}
          </select>
        </label>
        <label className={ui.campo}>
          Data da aplicação *
          <input name="data" type="date" required min={opcoes.hoje} />
        </label>
        <label className={`${ui.campo} ${ui.campoLargo}`}>
          Observação <small>(opcional)</small>
          <textarea name="observacao" maxLength={1000} rows={2} placeholder="Ex.: vale 10 pontos; questões 5 a 8 discursivas" />
        </label>
        <label className={`${ui.campo} ${ui.campoLargo}`}>
          Arquivo da avaliação * <small>Word (.doc, .docx) ou PDF, até 5 MB</small>
          <input
            name="arquivo"
            type="file"
            required
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          />
        </label>
      </div>
      <div className={ui.rodapeForm}>
        <span className={ui.contagem}>O CGA analisa as questões e aprova ou devolve com o parecer.</span>
        <BotaoEnviar enviando="Enviando…">Enviar ao CGA</BotaoEnviar>
      </div>
    </form>
  );
}

export function FormComunicado() {
  const [estado, acao] = useActionState<EstadoForm, FormData>(publicarComunicado, { tentativa: 0 });
  return (
    <form action={acao} className={ui.form}>
      {estado.ok && <Aviso tom="ok">{estado.ok}</Aviso>}
      {estado.erro && <Aviso tom="erro">{estado.erro}</Aviso>}
      <div className={ui.campos} key={estado.tentativa}>
        <label className={`${ui.campo} ${ui.campoLargo}`}>
          Título *
          <input name="titulo" required maxLength={120} placeholder="Ex.: Reunião pedagógica" />
        </label>
        <label className={`${ui.campo} ${ui.campoLargo}`}>
          Texto *
          <textarea name="texto" required maxLength={2000} rows={4} />
        </label>
      </div>
      <div className={ui.rodapeForm}>
        <span className={ui.contagem}>Aparece para todos os professores.</span>
        <BotaoEnviar enviando="Publicando…">Publicar</BotaoEnviar>
      </div>
    </form>
  );
}
