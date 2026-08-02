(function () {
  "use strict";

  const storagePrefix = "mpw-like-v1:";
  const likeIdPattern = /^[a-z0-9-]+$/;

  function normalizeId(id) {
    if (typeof id !== "string") {
      return null;
    }

    const normalizedId = id.trim().toLowerCase();
    return likeIdPattern.test(normalizedId) ? normalizedId : null;
  }

  function create(getStorage) {
    const memory = new Map();

    function getKey(id) {
      const normalizedId = normalizeId(id);
      return normalizedId ? `${storagePrefix}${normalizedId}` : null;
    }

    function read(id) {
      const key = getKey(id);
      if (!key) {
        return false;
      }

      if (memory.has(key)) {
        return memory.get(key);
      }

      try {
        const liked = getStorage().getItem(key) === "1";
        memory.set(key, liked);
        return liked;
      } catch {
        return false;
      }
    }

    function write(id, liked) {
      const key = getKey(id);
      if (!key) {
        return false;
      }

      const nextLiked = Boolean(liked);
      memory.set(key, nextLiked);

      try {
        if (nextLiked) {
          getStorage().setItem(key, "1");
        } else {
          getStorage().removeItem(key);
        }
      } catch {
        // Storage is optional; memory preserves this page session.
      }

      return true;
    }

    return { read, write };
  }

  window.MPW_LIKE_STATE = { create };
})();
