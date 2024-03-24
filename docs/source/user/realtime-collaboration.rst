.. _realtime-collaboration:

################
Realtime Collaboration
################

Apollon supports realtime collaboration by emitting patches when a model is changed, and importing
patches potentially emitted by other Apollon clients. Patches follow the `RFC 6902`_ standard (i.e. `JSON Patch`_),
so they can be applied to Apollon diagrams in any desired language.

.. code-block:: typescript

  // This method subscribes to model change patches.
  // The callback is called whenever a patch is emitted.
  editor.subscribeToModelChangePatches(callback: (patch: Patch) => void): number;

  // This method unsubscribes from model change patches.
  // The subscriptionId is the return value of the subscribeToModelChangePatches method.
  editor.unsubscribeFromModelChangePatches(subscriptionId: number): void;

  // This method imports a patch. This can be used to
  // apply patches emitted by other Apollon clients.
  editor.importPatch(patch: Patch): void;

Apollon client takes care of detecting conflicts between clients and resolving them. There is no need for
users to manually implement any reconcilliation mechanism. The only requirements to ensure a convergent state
between all Apollon clients are as follows:

- Apply all patches on all clients in the same order,
- Apply all patches on all clients, including patches emitted by the same client.

This means, if client A emits patch P1 and client B emits patch P2, both clients must then apply P1 and P2 in the same order (using `importPatch()`). The order can be picked by the server, but it needs to be the same for all clients. This means client A should also receive P1, although it has emitted P1 itself. Similarly client B should receive P2, although it has emitted P2 itself.

Apollon clients sign the patches they emit and treat receiving their own patches as confirmation that the patch has been applied and ordered with patches from other clients. They also optimize based on this assumption, to recognize when they are ahead of the rest of the clients on some part of the state: when client A applies the effects of patch P1 locally, its state is ahead until other clients have also applied patch P1, so client A can safely ignore other effects on that same part of the state (as it will get overwritten by patch P1 anyway).

================
Displaying Remote Users
================

In realtime collaboration, it can be useful to display activities of other users active in the collaboration session within the diagram editor. Apollon provides methods to display other users' selections:

.. code-block:: typescript

  // This method selects or deselects elements
  // on part of a given remote user with given name and color.
  // Provide the ids of the elements the remote user
  // has selected/deselected.
  editor.remoteSelect(
    selectorName: string,
    selectorColor: string,
    select: string[],
    deselect?: string[]
  ): void;

  // This method clears the list of remote users displayed
  // on the diagram editor, except allowed users.
  // Use this in case some users disconnect from the collaboration session.
  pruneRemoteSelectors(
    allowedSelectors: {
        name: string;
        color: string;
    }[]
  ): void;

.. _RFC 6902: https://tools.ietf.org/html/rfc6902
.. _JSON Patch: http://jsonpatch.com/