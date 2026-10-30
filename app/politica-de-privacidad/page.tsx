import type { Metadata } from "next";
import Link from "next/link";
import { getStudioWhatsAppHref } from "@/lib/studio-contact";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Información sobre el tratamiento de datos personales en 13 Studio Tattoo.",
};

export default function PrivacyPage() {
  const whatsappHref = getStudioWhatsAppHref("Hola, quisiera hacer una consulta sobre privacidad de mis datos.");

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-16 text-[#dedee3]">
      <article className="mx-auto max-w-3xl">
        <p className="studio-kicker"><span /> 13 Studio Tattoo</p>
        <h1 className="mt-6 text-4xl font-black">Política de privacidad</h1>
        <p className="mt-6 leading-7 text-[#a3a3ad]">
          Esta política cubre las solicitudes de turno y las cuentas de clientes de 13 Studio Tattoo. No se aplica a
          compras, cuentas ni servicios de AVG Connects.
        </p>

        <aside className="mt-6 rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 leading-7 text-amber-100" role="note">
          Aviso: la información legal y los plazos de conservación todavía requieren aprobación. La recepción de
          solicitudes y el registro de cuentas permanecen deshabilitados; no envíes datos personales hasta que el
          estudio publique la política aprobada y habilite expresamente el servicio.
        </aside>

        <h2 className="mt-8 text-xl font-bold">Responsable y datos tratados</h2>
        <p className="mt-3 leading-7 text-[#a3a3ad]">
          13 Studio Tattoo es el nombre comercial del estudio; la identidad legal y el domicilio del responsable del
          tratamiento están pendientes de confirmación y no se presume que el nombre comercial sea una persona jurídica.
          Si se habilita el servicio, para solicitar un turno se usarían nombre, email, teléfono, estilo,
          descripción de la idea y disponibilidad preferida. Las cuentas podrían incluir nombre, email, teléfono y,
          cuando se inicia sesión con Google, nombre e imagen de perfil proporcionados por ese servicio. Las contraseñas
          de cuentas locales se almacenan cifradas mediante hash; nunca incluyas información médica u otros datos
          sensibles en la descripción de una idea.
        </p>

        <h2 className="mt-8 text-xl font-bold">Finalidad, acceso y solicitudes</h2>
        <p className="mt-3 leading-7 text-[#a3a3ad]">
          Si la recopilación se habilita tras aprobar esta política, los datos se utilizarían para revisar propuestas,
          contactar al cliente y gestionar solicitudes y turnos. Una solicitud recibida no confirmaría un turno ni
          generaría un pago. Los registros se guardarían en la base de Studio y solo deberían ser consultados por
          administradores autorizados. No compartas datos de pago en los formularios.
        </p>
        <p className="mt-3 leading-7 text-[#a3a3ad]">
          Una vez habilitado el servicio, podrías solicitar acceso o actualización de tus datos al estudio por WhatsApp.
          Si tenés una cuenta, podés eliminarla desde tu perfil; los datos personales de tus turnos vinculados se
          anonimizan en la base operativa. El tratamiento de copias de seguridad y las excepciones legales requieren
          una política aprobada.
        </p>
        {whatsappHref ? (
          <a className="studio-book mt-4 inline-flex" href={whatsappHref} target="_blank" rel="noopener noreferrer">
            Consultar por WhatsApp
          </a>
        ) : null}

        <h2 className="mt-8 text-xl font-bold">Conservación</h2>
        <ul className="mt-3 list-disc space-y-3 pl-6 leading-7 text-[#a3a3ad]">
          <li>Solicitudes no confirmadas: plazo pendiente de definición y aprobación. No se programa eliminación automática mientras no exista un criterio publicado.</li>
          <li>Turnos cancelados: plazo pendiente de definición y aprobación. No se programa eliminación automática mientras no exista un criterio publicado.</li>
          <li>Cuentas de clientes: mientras permanezcan activas; la eliminación de la cuenta anonimiza los datos personales vinculados en la base operativa. La política final debe precisar las excepciones legales.</li>
          <li>Turnos completados: plazo no definido. No se asigna expiración automática hasta que el estudio confirme y documente un plazo.</li>
          <li>Copias de seguridad: proveedor, rotación, retención, restauración y eliminación definitiva no están verificados. El borrado o la anonimización en la base operativa no confirma la eliminación de copias.</li>
        </ul>

        <p className="mt-8 border-t border-[#2b2b31] pt-5 text-sm leading-6 text-[#a3a3ad]">
          La identidad legal y el domicilio del responsable, el plazo de conservación de turnos completados y la política
          de copias de seguridad deben confirmarse y reflejarse aquí antes de habilitar la recopilación de datos reales.
        </p>
        <Link href="/turnos" className="studio-text-link mt-8 inline-flex">Volver a turnos</Link>
      </article>
    </main>
  );
}
