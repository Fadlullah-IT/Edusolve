<script setup>
import { computed, ref, watch } from "vue";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";

const props = defineProps({
  open: { type: Boolean, default: false },
  initial: { type: Object, default: null }, // lesson or null
  nextOrder: { type: Number, default: 1 },
});

const emit = defineEmits(["update:open", "submit"]);

const saving = ref(false);
const error = ref("");
const title = ref("");
const order = ref(1);

const isEdit = computed(() => !!props.initial?.id);

const editor = useEditor({
  extensions: [StarterKit, Underline, Link.configure({ openOnClick: false })],
  content: "<p></p>",
});

watch(
  () => props.open,
  (v) => {
    if (!v) return;
    error.value = "";
    saving.value = false;

    title.value = props.initial?.title ?? "";
    order.value = Number(props.initial?.order ?? props.nextOrder);

    // content may be plain text or HTML; setContent handles both reasonably
    const htmlOrText = props.initial?.content ?? "";
    editor.value?.commands?.setContent(htmlOrText || "<p></p>");
  }
);

function close() {
  emit("update:open", false);
}

async function onSubmit() {
  error.value = "";
  if (!title.value.trim()) {
    error.value = "Lesson title is required.";
    return;
  }

  saving.value = true;
  try {
    const html = editor.value?.getHTML?.() ?? "";
    await emit("submit", {
      title: title.value.trim(),
      content: html,
      order: order.value,
    });
    emit("update:open", false);
  } catch (e) {
    error.value = e?.response?.data?.message || "Failed to save lesson.";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
  >
    <div
      class="bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-[#dbe0e6] flex flex-col max-h-[90vh]"
    >
      <div class="flex items-center justify-between px-6 py-4 border-b border-[#dbe0e6]">
        <h3 class="text-lg font-bold">{{ isEdit ? "Edit Lesson" : "Add New Lesson" }}</h3>
        <button class="text-[#617589] hover:text-[#111418]" @click="close">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <div class="p-6 flex flex-col gap-6 overflow-y-auto">
        <div
          v-if="error"
          class="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm"
        >
          {{ error }}
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium">Lesson Title</label>
          <input
            v-model="title"
            class="w-full rounded-lg border border-[#dbe0e6] p-3"
            type="text"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium">Order</label>
          <input
            v-model.number="order"
            class="w-full rounded-lg border border-[#dbe0e6] p-3"
            type="number"
            min="1"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium">Content</label>

          <div class="border border-[#dbe0e6] rounded-lg overflow-hidden bg-white">
            <div class="flex items-center gap-1 p-2 border-b border-[#dbe0e6] bg-gray-50">
              <button
                class="p-1.5 rounded hover:bg-[#dbe0e6]"
                @click="editor?.chain().focus().toggleBold().run()"
                type="button"
              >
                <span class="material-symbols-outlined text-[20px]">format_bold</span>
              </button>
              <button
                class="p-1.5 rounded hover:bg-[#dbe0e6]"
                @click="editor?.chain().focus().toggleItalic().run()"
                type="button"
              >
                <span class="material-symbols-outlined text-[20px]">format_italic</span>
              </button>
              <button
                class="p-1.5 rounded hover:bg-[#dbe0e6]"
                @click="editor?.chain().focus().toggleUnderline().run()"
                type="button"
              >
                <span class="material-symbols-outlined text-[20px]"
                  >format_underlined</span
                >
              </button>
              <div class="w-px h-5 bg-[#dbe0e6] mx-1"></div>
              <button
                class="p-1.5 rounded hover:bg-[#dbe0e6]"
                @click="editor?.chain().focus().toggleBulletList().run()"
                type="button"
              >
                <span class="material-symbols-outlined text-[20px]"
                  >format_list_bulleted</span
                >
              </button>
              <button
                class="p-1.5 rounded hover:bg-[#dbe0e6]"
                type="button"
                @click="
                  () => {
                    const url = prompt('Enter URL');
                    if (url)
                      editor
                        ?.chain()
                        .focus()
                        .extendMarkRange('link')
                        .setLink({ href: url })
                        .run();
                  }
                "
              >
                <span class="material-symbols-outlined text-[20px]">link</span>
              </button>
            </div>

            <div class="p-4 min-h-[220px]">
              <EditorContent
                :editor="editor"
                class="prose max-w-none focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="px-6 py-4 border-t border-[#dbe0e6] bg-gray-50 flex justify-end gap-3">
        <button
          class="px-4 py-2 rounded-lg border border-[#dbe0e6] text-[#617589]"
          @click="close"
          :disabled="saving"
        >
          Cancel
        </button>
        <button
          class="px-6 py-2 rounded-lg bg-primary text-white font-bold disabled:opacity-60"
          @click="onSubmit"
          :disabled="saving"
        >
          {{ isEdit ? "Save Lesson" : "Create Lesson" }}
        </button>
      </div>
    </div>
  </div>
</template>
