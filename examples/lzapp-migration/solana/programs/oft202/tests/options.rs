#[cfg(test)]
mod tests {

    use oft::options::{executor_lz_compose_option, executor_lz_receive_option};

    #[test]
    fn test_add_executor_lz_receive_option() {
        /****
         *  typescript code snippet:
         *
         *  import { arrayify } from '@layerzerolabs/lz-utilities'
         *	import { Options } from '@layerzerolabs/lz-v2-utilities'
         *  const options = Options.newOptions()
         *  options.addExecutorLzReceiveOption(123_456_789, 0)
         *  console.log('lzReceiveOptions', arrayify(options.toHex()))
         */
        let expected: Vec<u8> =
            vec![0, 3, 1, 0, 17, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 91, 205, 21];
        let result = executor_lz_receive_option(123_456_789);
        assert_eq!(result, expected);
    }

    #[test]
    fn test_add_executor_lz_compose_option() {
        /****
         *  typescript code snippet:
         *
         *  import { arrayify } from '@layerzerolabs/lz-utilities'
         *	import { Options } from '@layerzerolabs/lz-v2-utilities'
         *  const options = Options.newOptions()
         *  options.addExecutorLzComposeOption(0, 123_456_789, 0)
         *  console.log('composeOptions', arrayify(options.toHex()))
         */
        let index: u16 = 0;
        let expected =
            vec![0, 3, 1, 0, 19, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 91, 205, 21];
        let result = executor_lz_compose_option(index, 123_456_789);
        assert_eq!(result, expected);
    }
}
