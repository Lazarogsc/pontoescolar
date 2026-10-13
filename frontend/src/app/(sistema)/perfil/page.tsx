import type { Metadata } from "next";
import Link from "next/link";
import { Aviso, Cabecalho, Cartao, Tag, ui } from "@/components/ui";
import { NOMES_MODULOS } from "@/lib/formato";
import { usuarioAtual } from "@/lib/sessao";
import { FormSenha } from "./FormSenha";

export const metadata: Metadata = { title: "Meu perfil" };

function quando(iso: string | null) {
  if (!iso) return "—";
  const [data, hora] = iso.split("T");
  const [a, m, d] = data.split("-");
  return `${d}/${m}/${a}${hora ? ` às ${hora.slice(0, 5)}` : ""}`;
}

export default async function PerfilPage({ searchParams }: PageProps<"/perfil">) {
  const [u, { trocar }] = await Promise.all([usuarioAtual(), searchParams]);
  const pendente = u.trocar_senha || trocar === "1";

  return (
    <>
      <Cabecalho titulo="Meu perfil" subtitulo="Seus dados de acesso e o que você pode ver no sistema" />

      {u.trocar_senha && (
        <Aviso tom="erro">Por segurança, defina uma nova senha antes de continuar. A senha atual é a que você recebeu da escola.</Aviso>
      )}

      <div className={ui.grade2}>
        <Cartao titulo="Dados de acesso">
          <dl className={ui.dl}>
            <dt>Nome</dt>
            <dd>{u.nome}</dd>
            <dt>Login</dt>
            <dd className="mono">{u.login}</dd>
            <dt>E-mail</dt>
            <dd>{u.email ?? "—"}</dd>
            <dt>Setor</dt>
            <dd>
              {u.setor} {u.perfil === "superadmin" && <Tag tom="neutro">Superadmin</Tag>}
            </dd>
            {u.funcionario && (
              <>
                <dt>Funcionário</dt>
                <dd>
                  <Link href={`/meu-rh/${u.funcionario_id}`}>{u.funcionario}</Link>
                </dd>
              </>
            )}
            {u.matriculas.length > 0 && (
              <>
                <dt>Alunos</dt>
                <dd>
                  {u.matriculas.map((m, i) => (
                    <span key={m}>
                      {i > 0 && ", "}
                      <Link className="mono" href={`/responsavel/${m}`}>
                        {m}
                      </Link>
                    </span>
                  ))}
                </dd>
              </>
            )}
            <dt>Último acesso</dt>
            <dd>{quando(u.ultimo_acesso)}</dd>
            <dt>Conta criada</dt>
            <dd>{quando(u.criado_em)}</dd>
          </dl>
        </Cartao>

        <Cartao titulo="O que você pode acessar">
          <ul className={ui.lista}>
            {u.modulos.map((m) => (
              <li key={m}>
                <div>
                  <strong>{NOMES_MODULOS[m]?.nome ?? m}</strong>
                  <span>{NOMES_MODULOS[m]?.descricao}</span>
                </div>
              </li>
            ))}
          </ul>
          <p className={ui.contagem} style={{ marginTop: 10 }}>
            Precisa de outro acesso? Peça ao administrador para mudar o seu setor.
          </p>
        </Cartao>
      </div>

      <Cartao titulo={pendente ? "Defina sua nova senha" : "Trocar senha"}>
        <FormSenha pendente={u.trocar_senha} />
      </Cartao>
    </>
  );
}
