import { json, redirect } from "@remix-run/node";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { Form, Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { prisma } from "../utils/prisma.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Notes" },
    { name: "description", content: "A simple notes app." },
  ];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const noteId = url.searchParams.get("noteId");

  console.time("notes");
  const notes = await prisma.notes.findMany({
    orderBy: {
      updatedAt: "desc",
    },
  });
  console.timeEnd("notes");
  let selectedNote = null;
  if (noteId) {
    selectedNote = await prisma.notes.findUnique({
      where: { id: noteId },
    });
  }

  return json({ notes, selectedNote });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const { _action, ...values } = Object.fromEntries(formData);

  if (_action === "create") {
    const newNote = await prisma.notes.create({
      data: {
        title: "New Note",
        content: "",
      },
    });
    return redirect(`/?noteId=${newNote.id}`);
  }

  if (_action === "update") {
    const { noteId, title, content } = values;
    await prisma.notes.update({
      where: { id: String(noteId) },
      data: {
        title: String(title),
        content: String(content),
      },
    });
    return json({ ok: true });
  }

  return json({ ok: false }, { status: 400 });
}

export default function Index() {
  const { notes, selectedNote } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const noteId = searchParams.get("noteId");

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <aside className="w-1/3 border-r border-gray-200 bg-gray-100">
        <div className="p-4">
          <Form method="post">
            <button
              type="submit"
              name="_action"
              value="create"
              className="w-full rounded-md bg-blue-500 py-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Create Note
            </button>
          </Form>
        </div>
        <nav>
          <ul>
            {notes.map((note) => (
              <li key={note.id}>
                <Link
                  to={`/?noteId=${note.id}`}
                  className={`block border-b border-gray-200 p-4 text-sm hover:bg-gray-200 ${
                    note.id === noteId ? "bg-white" : ""
                  }`}
                >
                  <h2 className="font-semibold text-gray-800">{note.title}</h2>
                  <p className="truncate text-xs text-gray-500">
                    {note.content || "No content"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main className="w-2/3">
        {selectedNote ? (
          <Form method="post" key={selectedNote.id} className="h-full">
            <input type="hidden" name="noteId" value={selectedNote.id} />
            <div className="flex h-full flex-col">
              <input
                type="text"
                name="title"
                defaultValue={selectedNote.title}
                className="border-b border-gray-200 p-4 text-lg font-semibold focus:outline-none"
                placeholder="Title"
              />
              <textarea
                name="content"
                defaultValue={selectedNote.content ?? ""}
                className="flex-grow resize-none p-4 focus:outline-none"
                placeholder="Start writing..."
              />
              <div className="border-t border-gray-200 p-4">
                <button
                  type="submit"
                  name="_action"
                  value="update"
                  className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          </Form>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            <p>Select a note or create a new one.</p>
          </div>
        )}
      </main>
    </div>
  );
}
