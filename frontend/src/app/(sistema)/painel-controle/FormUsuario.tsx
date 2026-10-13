"use client";

import { useActionState, useState } from "react";
import { BotaoEnviar } from "@/components/BotaoEnviar";
import { Aviso, ui } from "@/components/ui";
import type { OpcoesAdmin, UsuarioAdmin } from "@/lib/api";
import { criarUsuario, salvarUsuario, type EstadoAdmin } from "./actions";

/** Formulário de usuário: novo (com senha inicial) ou edição (sem senha; a senha tem formulário próprio). */
export function FormUsuario({ opcoes, usuario }: { opcoes: OpcoesAdmin; usuario?: UsuarioAdmin }) {
  const acaoServidor = usuario ? salvarUsuario.bind(null, usuario.id) : criarUsuario;
  const [estado, acao] = useActionState<EstadoAdmin, FormData>(acaoServidor, { tentativa: 0 });
  const [setor, setSetor] = useState(usuario?.setor ?? "");
  const [perfil, setPerfil] = useState(usuario?.perfil ?? "usuario");
  const acessos = perfil === "superadmin" ? ["Tudo, inclusive o Painel de Controle"] : (opcoes.acessos[setor] ?? []);

  return (
    <form action={acao} className={ui.form}>
      {estado.ok && <Aviso tom="ok">{estado.ok}</Aviso>}
      {estado.erro && <Aviso tom="erro">{estado.erro}</Aviso>}

      <fieldset className={ui.secao}>
        <h3>Identificação</h3>
        <div className={ui.campos}>
          <label className={`${ui.campo} ${ui.campoLargo}`}>
            Nome completo *
            <input name="nome" required minLength={3} defaultValue={usuario?.nome} autoComplete="off" />
          </label>
          <label className={ui.campo}>
            Login *
            <input name="login" required pattern="[a-zA-Z0-9._\-]{3,40}" defaultValue={usuario?.login} autoComplete="off" autoCapitalize="none" spellCheck={false} />
            <small>Ex.: maria.silva (letras, números, ponto, hífen)</small>
          </label>
          <label className={ui.campo}>
            E-mail
            <input name="email" type="email" defaultValue={usuario?.email ?? ""} autoComplete="off" />
            <small>Também serve para entrar no sistema.</small>
          </label>
        </div>
      </fieldset>

      <fieldset className={ui.secao}>
        <h3>Setor e permissões</h3>
        <div className={ui.campos}>
          <label className={ui.campo}>
            Setor *
            <select name="setor" required value={setor} onChange={(e) => setSetor(e.target.value)}>
              <option value="" disabled>
                Escolha o setor
              </option>
              {opcoes.setores.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className={ui.campo}>
            Perfil
            <select name="perfil" value={perfil} onChange={(e) => setPerfil(e.target.value as typeof perfil)}>
              <option value="usuario">Usuário comum</option>
              <option value="superadmin">Superadmin (controla tudo)</option>
            </select>
          </label>
          <label className={ui.campo}>
            Funcionário vinculado <small>(para o Meu RH)</small>
            <select name="funcionario_id" defaultValue={usuario?.funcionario_id ?? ""}>
              <option value="">Nenhum</option>
              {opcoes.funcionarios.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome} — {f.cargo}
                </option>
              ))}
            </select>
          </label>
          {(setor === "Responsável" || (usuario?.matriculas.length ?? 0) > 0) && (
            <label className={ui.campo}>
              Matrículas dos filhos <small>(separe por vírgula)</small>
              <input name="matriculas" inputMode="numeric" placeholder="20260001, 20260002" defaultValue={usuario?.matriculas.join(", ")} />
            </label>
          )}
        </div>
        {setor && (
          <p className={ui.contagem}>
            Este usuário vai acessar: <strong>{acessos.length ? acessos.join(" · ") : "nada (escolha outro setor)"}</strong>
          </p>
        )}
      </fieldset>

      {!usuario && (
        <fieldset className={ui.secao}>
          <h3>Senha inicial</h3>
          <div className={ui.campos}>
            <label className={ui.campo}>
              Senha *
              <input name="senha" type="password" required minLength={opcoes.senha_minima} autoComplete="new-password" />
              <small>Mínimo de {opcoes.senha_minima} caracteres, com letras e números.</small>
            </label>
            <label className={ui.campo}>
              Repita a senha *
              <input name="confirmacao" type="password" required minLength={opcoes.senha_minima} autoComplete="new-password" />
            </label>
          </div>
          <label className={ui.contagem} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" name="trocar_senha" defaultChecked /> Pedir para a pessoa trocar a senha no primeiro acesso
          </label>
        </fieldset>
      )}

      <div className={ui.rodapeForm}>
        <span className={ui.contagem}>Os campos com * são obrigatórios.</span>
        <BotaoEnviar>{usuario ? "Salvar alterações" : "Criar usuário"}</BotaoEnviar>
      </div>
    </form>
  );
}
