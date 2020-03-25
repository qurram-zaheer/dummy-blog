export default function (context) {
   console.log("HELLO")

   context.store.dispatch('initAuth', context.req)

}